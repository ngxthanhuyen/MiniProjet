using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Security.Cryptography;
using System.Text;
using API.Data;
using API.Models;

var builder = WebApplication.CreateBuilder(args);

//CORS 
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReact", policy =>
    {
        policy.WithOrigins("http://localhost:3002") // frontend React
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// MariaDB  
var connectionString = "server=localhost;database=miniCloud;user=root;password=cunxinhdep";
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString)));

// JWT 
var jwtKey = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddAuthorization();

// Swagger 
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

//CORS avant Auth
app.UseCors("AllowReact");

app.UseAuthentication();
app.UseAuthorization();

app.UseSwagger();
app.UseSwaggerUI();

app.UseHttpsRedirection();

// Création du dossier upload
var uploadPath = Path.Combine(Directory.GetCurrentDirectory(), "UploadedFiles");
Directory.CreateDirectory(uploadPath);

// Routes 

// Register
app.MapPost("/register", async (AppDbContext db, AuthRequest req) =>
{
    if (await db.Users.AnyAsync(u => u.Username == req.Username))
        return Results.BadRequest("User exists");

    db.Users.Add(new User { Username = req.Username, Password = req.Password });
    await db.SaveChangesAsync();
    return Results.Ok("User registered");
});

// Login
app.MapPost("/login", async (AppDbContext db, AuthRequest req) =>
{
    var user = await db.Users.FirstOrDefaultAsync(u => u.Username == req.Username && u.Password == req.Password);
    if (user == null) return Results.Unauthorized();

    var tokenHandler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
    var key = Encoding.UTF8.GetBytes(jwtKey);
    var tokenDescriptor = new Microsoft.IdentityModel.Tokens.SecurityTokenDescriptor
    {
        Expires = DateTime.UtcNow.AddHours(1),
        SigningCredentials = new Microsoft.IdentityModel.Tokens.SigningCredentials(
            new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
    };
    var token = tokenHandler.CreateToken(tokenDescriptor);
    return Results.Ok(new { token = tokenHandler.WriteToken(token) });
});

// Upload file
app.MapPost("/upload", async (HttpRequest request, AppDbContext db) =>
{
    if (!request.HasFormContentType) return Results.BadRequest("Form data required.");
    var form = await request.ReadFormAsync();
    var file = form.Files["file"];
    if (file == null || file.Length == 0) return Results.BadRequest("No file provided.");

    var username = request.Headers["Username"].ToString();
    var filePath = Path.Combine(uploadPath, file.FileName);
    using var stream = File.Create(filePath);
    await file.CopyToAsync(stream);

    db.Files.Add(new FileItem { FileName = file.FileName, OwnerUsername = username, UploadDate = DateTime.UtcNow });
    await db.SaveChangesAsync();
    return Results.Ok(new { file.FileName, file.Length });
}).RequireAuthorization();

// List files
app.MapGet("/files", async (AppDbContext db, HttpRequest request) =>
{
    var username = request.Headers["Username"].ToString();
    var files = await db.Files.Where(f => f.OwnerUsername == username)
                              .Select(f => f.FileName)
                              .ToListAsync();
    return Results.Ok(files);
}).RequireAuthorization();

// Download
app.MapGet("/files/download/{filename}", (string filename) =>
{
    var filePath = Path.Combine(uploadPath, filename);
    if (!File.Exists(filePath)) return Results.NotFound("File not found");
    return Results.File(filePath, "application/octet-stream", filename);
}).RequireAuthorization();

// Delete
app.MapDelete("/files/{filename}", async (string filename, AppDbContext db, HttpRequest request) =>
{
    var username = request.Headers["Username"].ToString();
    var file = await db.Files.FirstOrDefaultAsync(f => f.FileName == filename && f.OwnerUsername == username);
    if (file == null) return Results.NotFound("File not found");

    var filePath = Path.Combine(uploadPath, filename);
    File.Delete(filePath);
    db.Files.Remove(file);
    await db.SaveChangesAsync();
    return Results.Ok($"Deleted {filename}");
}).RequireAuthorization();

app.Run();
