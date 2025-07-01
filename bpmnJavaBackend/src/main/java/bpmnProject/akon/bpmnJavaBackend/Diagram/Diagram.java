package bpmnProject.akon.bpmnJavaBackend.Diagram;

import jakarta.persistence.*;
import lombok.Getter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Entity
@Table(name = "diagrams")
public class Diagram {
    // Getters and Setters
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String fileName;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(columnDefinition = "JSON")
    private String metadata;

    private String description;
    private String tags;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    private String createdBy;
    private String updatedBy;

    @OneToMany(mappedBy = "originalDiagram", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<DiagramVersion> versions = new ArrayList<>();

    // Default constructor
    public Diagram() {}

    // Constructor with required fields
    public Diagram(String fileName, String content) {
        this.fileName = fileName;
        this.content = content;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public void setMetadata(String metadata) {
        this.metadata = metadata;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public void setTags(String tags) {
        this.tags = tags;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }

    public void setUpdatedBy(String updatedBy) {
        this.updatedBy = updatedBy;
    }

    public void setVersions(List<DiagramVersion> versions) {
        this.versions = versions;
    }

    // Helper methods
    public void addVersion(DiagramVersion version) {
        versions.add(version);
        version.setOriginalDiagram(this);
    }

    public void removeVersion(DiagramVersion version) {
        versions.remove(version);
        version.setOriginalDiagram(null);
    }

    public int getVersionCount() {
        return versions != null ? versions.size() : 0;
    }

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (updatedAt == null) {
            updatedAt = LocalDateTime.now();
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }

    @Override
    public String toString() {
        return "Diagram{" +
                "id=" + id +
                ", fileName='" + fileName + '\'' +
                ", description='" + description + '\'' +
                ", createdAt=" + createdAt +
                ", updatedAt=" + updatedAt +
                ", createdBy='" + createdBy + '\'' +
                ", versionCount=" + getVersionCount() +
                '}';
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Diagram)) return false;
        Diagram diagram = (Diagram) o;
        return id != null && id.equals(diagram.id);
    }

    @Override
    public int hashCode() {
        return id != null ? id.hashCode() : 0;
    }
}