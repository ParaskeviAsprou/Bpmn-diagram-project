package bpmnProject.akon.bpmnJavaBackend.File;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "file_versions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(exclude = "originalFile")
@ToString(exclude = "originalFile")
public class FileVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "original_file_id", nullable = false)
    @JsonIgnore
    private File originalFile;

    @Column(name = "version_number", nullable = false)
    private Integer versionNumber;

    @Column(name = "file_name")
    private String fileName;

    @Column(name = "file_type")
    private String fileType;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "created_time", nullable = false)
    private LocalDateTime createdTime;

    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "version_notes", length = 1000)
    private String versionNotes;

    @Lob
    @Column(name = "file_data", columnDefinition = "LONGBLOB")
    @JsonIgnore
    private byte[] data;

    // Transient field for base64 representation
    @Transient
    private String base64Data;

    @Transient
    private String content;

    @Column(name = "is_current", nullable = false)
    @Builder.Default
    private Boolean isCurrent = false;

    // Helper methods
    public String getContent() {
        if (content == null && data != null) {
            try {
                content = new String(data, "UTF-8");
            } catch (Exception e) {
                content = "Binary content cannot be displayed as text";
            }
        }
        return content;
    }

    public String getFormattedFileSize() {
        if (fileSize == null || fileSize == 0) return "0 Bytes";
        String[] sizes = {"Bytes", "KB", "MB", "GB"};
        int i = (int) Math.floor(Math.log(fileSize) / Math.log(1024));
        return Math.round(fileSize / Math.pow(1024, i) * 100.0) / 100.0 + " " + sizes[i];
    }

    public void setData(byte[] data) {
        this.data = data;
        if (data != null) {
            this.fileSize = (long) data.length;
        }
    }
}