package bpmnProject.akon.bpmnJavaBackend.DtoClasses;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class DiagramDto {

    private Long id;

    @NotBlank(message = "File name is required")
    @Size(max = 255, message = "File name must not exceed 255 characters")
    private String fileName;

    @NotBlank(message = "Content is required")
    private String content;

    private String description;

    private List<String> tags;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;

    private String createdBy;
    private String updatedBy;

    private DiagramMetadataDto metadata;

    private Integer versionCount;
    private boolean hasVersions;

    // Constructors
    public DiagramDto() {}

    public DiagramDto(String fileName, String content) {
        this.fileName = fileName;
        this.content = content;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

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

    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }

    public DiagramMetadataDto getMetadata() { return metadata; }
    public void setMetadata(DiagramMetadataDto metadata) { this.metadata = metadata; }

    public Integer getVersionCount() { return versionCount; }
    public void setVersionCount(Integer versionCount) { this.versionCount = versionCount; }

    public boolean isHasVersions() { return hasVersions; }
    public void setHasVersions(boolean hasVersions) { this.hasVersions = hasVersions; }

    // Helper methods
    public String getFormattedCreatedAt() {
        return createdAt != null ? createdAt.toString() : "Unknown";
    }

    public String getFormattedUpdatedAt() {
        return updatedAt != null ? updatedAt.toString() : "Unknown";
    }

    public boolean hasMetadata() {
        return metadata != null && (
                (metadata.elementColors != null && !metadata.elementColors.isEmpty()) ||
                        (metadata.customProperties != null && !metadata.customProperties.isEmpty()) ||
                        metadata.diagramSettings != null
        );
    }

    // Nested DTO for metadata
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class DiagramMetadataDto {
        private Map<String, ElementColorDto> elementColors;
        private Map<String, List<CustomPropertyDto>> customProperties;
        private DiagramSettingsDto diagramSettings;

        public DiagramMetadataDto() {}

        public Map<String, ElementColorDto> getElementColors() { return elementColors; }
        public void setElementColors(Map<String, ElementColorDto> elementColors) { this.elementColors = elementColors; }

        public Map<String, List<CustomPropertyDto>> getCustomProperties() { return customProperties; }
        public void setCustomProperties(Map<String, List<CustomPropertyDto>> customProperties) { this.customProperties = customProperties; }

        public DiagramSettingsDto getDiagramSettings() { return diagramSettings; }
        public void setDiagramSettings(DiagramSettingsDto diagramSettings) { this.diagramSettings = diagramSettings; }
    }

    // Element color DTO
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class ElementColorDto {
        private String fill;
        private String stroke;

        public ElementColorDto() {}

        public ElementColorDto(String fill, String stroke) {
            this.fill = fill;
            this.stroke = stroke;
        }

        public String getFill() { return fill; }
        public void setFill(String fill) { this.fill = fill; }

        public String getStroke() { return stroke; }
        public void setStroke(String stroke) { this.stroke = stroke; }
    }

    // Custom property DTO
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class CustomPropertyDto {
        private String id;
        private String title;
        private String type;
        private Object value;
        private Boolean required;
        private String description;
        private List<String> options;
        private String category;
        private Integer order;

        public CustomPropertyDto() {}

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }

        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }

        public String getType() { return type; }
        public void setType(String type) { this.type = type; }

        public Object getValue() { return value; }
        public void setValue(Object value) { this.value = value; }

        public Boolean getRequired() { return required; }
        public void setRequired(Boolean required) { this.required = required; }

        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }

        public List<String> getOptions() { return options; }
        public void setOptions(List<String> options) { this.options = options; }

        public String getCategory() { return category; }
        public void setCategory(String category) { this.category = category; }

        public Integer getOrder() { return order; }
        public void setOrder(Integer order) { this.order = order; }
    }

    // Diagram settings DTO
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class DiagramSettingsDto {
        private Double zoom;
        private String viewBox;
        private String theme;
        private Boolean gridEnabled;
        private Boolean snapToGrid;
        private String lastModified;
        private String version;

        public DiagramSettingsDto() {}

        public Double getZoom() { return zoom; }
        public void setZoom(Double zoom) { this.zoom = zoom; }

        public String getViewBox() { return viewBox; }
        public void setViewBox(String viewBox) { this.viewBox = viewBox; }

        public String getTheme() { return theme; }
        public void setTheme(String theme) { this.theme = theme; }

        public Boolean getGridEnabled() { return gridEnabled; }
        public void setGridEnabled(Boolean gridEnabled) { this.gridEnabled = gridEnabled; }

        public Boolean getSnapToGrid() { return snapToGrid; }
        public void setSnapToGrid(Boolean snapToGrid) { this.snapToGrid = snapToGrid; }

        public String getLastModified() { return lastModified; }
        public void setLastModified(String lastModified) { this.lastModified = lastModified; }

        public String getVersion() { return version; }
        public void setVersion(String version) { this.version = version; }
    }

    @Override
    public String toString() {
        return "DiagramDto{" +
                "id=" + id +
                ", fileName='" + fileName + '\'' +
                ", description='" + description + '\'' +
                ", createdAt=" + createdAt +
                ", updatedAt=" + updatedAt +
                ", createdBy='" + createdBy + '\'' +
                ", hasMetadata=" + hasMetadata() +
                ", versionCount=" + versionCount +
                '}';
    }
}