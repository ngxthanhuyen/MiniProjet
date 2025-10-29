namespace API.Models;

public class FileItem
{
    public int Id { get; set; }
    public string FileName { get; set; } = null!;
    public string OwnerUsername { get; set; } = null!;
    public DateTime UploadDate { get; set; }
}
