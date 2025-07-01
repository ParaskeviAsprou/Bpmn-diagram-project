package bpmnProject.akon.bpmnJavaBackend.Diagram;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "diagram_versions")
public class DiagramVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "original_diagram_id", nullable = false)
    @JsonIgnore
    private Diagram originalDiagram;

    @Column(name = "version_number", nullable = false)
    private Integer versionNumber;

    @Column(name = "file_name")
    private String fileName;

    @Column(name = "content", columnDefinition = "TEXT")
    private String content;

    @Column(name = "metadata", columnDefinition = "JSON")
    private String metadata;

    @Column(name = "description")
    private String description;

    @Column(name = "tags")
    private String tags;

    @Column(name = "created_time", nullable = false)
    private LocalDateTime createdTime;

    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "version_notes", length = 1000)
    private String versionNotes;

    // Default constructor
    public DiagramVersion() {}

    // Constructor with required fields
    public DiagramVersion(Diagram originalDiagram, Integer versionNumber, String content) {
        this.originalDiagram = originalDiagram;
        this.versionNumber = versionNumber;
        this.content = content;
        this.createdTime = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Diagram getOriginalDiagram() {
        return originalDiagram;
    }

    public void setOriginalDiagram(Diagram originalDiagram) {
        this.originalDiagram = originalDiagram;
    }

    public Integer getVersionNumber() {
        return versionNumber;
    }

    public void setVersionNumber(Integer versionNumber) {
        this.versionNumber = versionNumber;
    }

    public String getFileName() {
        return fileName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getMetadata() {
        return metadata;
    }

    public void setMetadata(String metadata) {
        this.metadata = metadata;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getTags() {
        return tags;
    }

    public void setTags(String tags) {
        this.tags = tags;
    }

    public LocalDateTime getCreatedTime() {
        return createdTime;
    }

    public void setCreatedTime(LocalDateTime createdTime) {
        this.createdTime = createdTime;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }

    public String getVersionNotes() {
        return versionNotes;
    }

    public void setVersionNotes(String versionNotes) {
        this.versionNotes = versionNotes;
    }

    // Helper methods
    public String getFormattedCreatedTime() {
        return createdTime != null ? createdTime.toString() : "Unknown";
    }

    public String getVersionLabel() {
        return "Version " + versionNumber;
    }

    public boolean hasMetadata() {
        return metadata != null && !metadata.trim().isEmpty();
    }

    @PrePersist
    public void prePersist() {
        if (createdTime == null) {
            createdTime = LocalDateTime.now();
        }
    }

    @Override
    public String toString() {
        return "DiagramVersion{" +
                "id=" + id +
                ", versionNumber=" + versionNumber +
                ", fileName='" + fileName + '\'' +
                ", createdTime=" + createdTime +
                ", createdBy='" + createdBy + '\'' +
                ", hasMetadata=" + hasMetadata() +
                '}';
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof DiagramVersion)) return false;
        DiagramVersion that = (DiagramVersion) o;
        return id != null && id.equals(that.id);
    }

    @Override
    public int hashCode() {
        return id != null ? id.hashCode() : 0;
    }
}