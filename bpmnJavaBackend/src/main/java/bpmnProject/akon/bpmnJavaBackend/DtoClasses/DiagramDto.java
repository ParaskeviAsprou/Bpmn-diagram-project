package bpmnProject.akon.bpmnJavaBackend.DtoClasses;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public class DiagramDto {
    private Long id;

    @NotBlank(message = "File name is required")
    private String fileName;

    @NotBlank(message = "Content is required")
    private String content;

    @NotNull(message = "Metadata is required")
    private DiagramMetadataDto metadata;

    private String description;
    private List<String> tags;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;

    // Constructors
    public DiagramDto() {}

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public DiagramMetadataDto getMetadata() { return metadata; }
    public void setMetadata(DiagramMetadataDto metadata) { this.metadata = metadata; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public List<String> getTags() { return tags; }
    public void setTags(List<String> tags) { this.tags = tags; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    // Inner class for metadata
    public static class DiagramMetadataDto {
        private Map<String, ElementColorDto> elementColors;
        private Map<String, List<CustomPropertyDto>> customProperties;
        private DiagramSettingsDto diagramSettings;

        // Constructors, getters, and setters
        public DiagramMetadataDto() {}

        public Map<String, ElementColorDto> getElementColors() { return elementColors; }
        public void setElementColors(Map<String, ElementColorDto> elementColors) { this.elementColors = elementColors; }

        public Map<String, List<CustomPropertyDto>> getCustomProperties() { return customProperties; }
        public void setCustomProperties(Map<String, List<CustomPropertyDto>> customProperties) { this.customProperties = customProperties; }

        public DiagramSettingsDto getDiagramSettings() { return diagramSettings; }
        public void setDiagramSettings(DiagramSettingsDto diagramSettings) { this.diagramSettings = diagramSettings; }
    }
}
