package bpmnProject.akon.bpmnJavaBackend.File;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;

import java.io.Serializable;
import java.time.LocalDateTime;

@Table(name = "files")
@Entity
@Getter
@Setter
@Data
public class File implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "file_name")
    private String fileName;

    @Column(name = "file_type")
    private String fileType;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "upload_time")
    private LocalDateTime uploadTime;

    // Store file data as binary in database
    @Lob
    @Column(name = "file_data", columnDefinition = "LONGBLOB")
    @JsonIgnore // Don't serialize raw data in JSON
    private byte[] data;

    // Transient field for base64 representation (not stored in DB)
    @Transient
    private String base64Data;

    // Short link for file access (optional)
    @Column(name = "short_link")
    private String shortLink;

    // Content preview for frontend (transient)
    @Transient
    private String content;

    // Default constructor
    public File() {}

    // Constructor with parameters
    public File(String fileName, String fileType, Long fileSize, byte[] data, LocalDateTime uploadTime) {
        this.fileName = fileName;
        this.fileType = fileType;
        this.fileSize = fileSize;
        this.data = data;
        this.uploadTime = uploadTime;
    }

    public void setData(byte[] data) {
        this.data = data;
        // Update file size when data is set
        if (data != null) {
            this.fileSize = (long) data.length;
        }
    }

    public String getContent() {
        if (content == null && data != null) {
            // Convert binary data to string for preview
            try {
                content = new String(data, "UTF-8");
            } catch (Exception e) {
                content = "Binary content cannot be displayed as text";
            }
        }
        return content;
    }

    // Helper methods
    public boolean isBpmnFile() {
        return fileName != null && (fileName.endsWith(".bpmn") || fileName.endsWith(".xml")) ||
                fileType != null && fileType.contains("xml");
    }

    public String getFormattedFileSize() {
        if (fileSize == null || fileSize == 0) return "0 Bytes";
        String[] sizes = {"Bytes", "KB", "MB", "GB"};
        int i = (int) Math.floor(Math.log(fileSize) / Math.log(1024));
        return Math.round(fileSize / Math.pow(1024, i) * 100.0) / 100.0 + " " + sizes[i];
    }

    @Override
    public String toString() {
        return "File{" +
                "id=" + id +
                ", fileName='" + fileName + '\'' +
                ", fileType='" + fileType + '\'' +
                ", fileSize=" + fileSize +
                ", uploadTime=" + uploadTime +
                ", shortLink='" + shortLink + '\'' +
                ", dataLength=" + (data != null ? data.length : 0) +
                '}';
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof File)) return false;
        File file = (File) o;
        return id != null && id.equals(file.id);
    }

    @Override
    public int hashCode() {
        return id != null ? id.hashCode() : 0;
    }
}