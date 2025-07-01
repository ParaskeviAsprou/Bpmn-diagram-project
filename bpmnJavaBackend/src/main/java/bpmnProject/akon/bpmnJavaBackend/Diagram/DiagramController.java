package bpmnProject.akon.bpmnJavaBackend.Diagram;

import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import bpmnProject.akon.bpmnJavaBackend.DtoClasses.DiagramDto;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/diagrams")
@CrossOrigin(origins = "*")
public class DiagramController {
    @Autowired
    private DiagramService DiagramService;

    @PostMapping
    @PreAuthorize("hasRole('ROLE_MODELER') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<DiagramDto> createDiagram(
            @Valid @RequestBody DiagramDto diagramDto) {
        try {
            DiagramDto savedDiagram = DiagramService.saveDiagram(diagramDto);
            return new ResponseEntity<>(savedDiagram, HttpStatus.CREATED);
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Update existing enhanced diagram
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_MODELER') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<DiagramDto> updateEnhancedDiagram(
            @PathVariable Long id,
            @Valid @RequestBody DiagramDto diagramDto) {
        try {
            Optional<DiagramDto> existingDiagram = DiagramService.getDiagramById(id);
            if (existingDiagram.isPresent()) {
                diagramDto.setId(id);
                DiagramDto updatedDiagram = DiagramService.updateDiagram(diagramDto);
                return new ResponseEntity<>(updatedDiagram, HttpStatus.OK);
            } else {
                return new ResponseEntity<>(null, HttpStatus.NOT_FOUND);
            }
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_VIEWER') or hasRole('ROLE_MODELER') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<DiagramDto> getEnhancedDiagram(@PathVariable Long id) {
        try {
            Optional<DiagramDto> diagram = DiagramService.getDiagramById(id);
            if (diagram.isPresent()) {
                return new ResponseEntity<>(diagram.get(), HttpStatus.OK);
            } else {
                return new ResponseEntity<>(null, HttpStatus.NOT_FOUND);
            }
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @GetMapping
    @PreAuthorize("hasRole('ROLE_VIEWER') or hasRole('ROLE_MODELER') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<List<DiagramDto>> getAllEnhancedDiagrams() {
        try {
            List<DiagramDto> diagrams = DiagramService.getAllDiagramsForCurrentUser();
            return new ResponseEntity<>(diagrams, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Delete enhanced diagram
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_ADMIN') or (hasRole('ROLE_MODELER') and @enhancedDiagramService.isOwner(#id))")
    public ResponseEntity<Void> deleteEnhancedDiagram(@PathVariable Long id) {
        try {
            boolean deleted = DiagramService.deleteDiagram(id);
            if (deleted) {
                return new ResponseEntity<>(HttpStatus.NO_CONTENT);
            } else {
                return new ResponseEntity<>(HttpStatus.NOT_FOUND);
            }
        } catch (Exception e) {
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Import enhanced diagram from JSON
     */
    @PostMapping("/import")
    @PreAuthorize("hasRole('ROLE_MODELER') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<DiagramDto> importEnhancedDiagram(
            @Valid @RequestBody DiagramDto diagramDto) {
        try {
            // Remove ID to create new diagram
            diagramDto.setId(null);
            DiagramDto importedDiagram = DiagramService.saveDiagram(diagramDto);
            return new ResponseEntity<>(importedDiagram, HttpStatus.CREATED);
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Restore diagram from backup
     */
    @PostMapping("/restore")
    @PreAuthorize("hasRole('ROLE_MODELER') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<DiagramDto> restoreFromBackup(
            @Valid @RequestBody DiagramDto backupData) {
        try {
            // Remove ID and timestamps to create new diagram
            backupData.setId(null);
            backupData.setCreatedAt(null);
            backupData.setUpdatedAt(null);

            DiagramDto restoredDiagram = DiagramService.saveDiagram(backupData);
            return new ResponseEntity<>(restoredDiagram, HttpStatus.CREATED);
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Validate diagram metadata
     */
    @PostMapping("/{id}/validate")
    @PreAuthorize("hasRole('ROLE_VIEWER') or hasRole('ROLE_MODELER') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<ValidationResult> validateDiagramMetadata(@PathVariable Long id) {
        try {
            ValidationResult result =DiagramService.validateDiagramMetadata(id);
            return new ResponseEntity<>(result, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get diagram metadata statistics
     */
    @GetMapping("/{id}/metadata/statistics")
    @PreAuthorize("hasRole('ROLE_VIEWER') or hasRole('ROLE_MODELER') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<MetadataStatistics> getDiagramMetadataStatistics(@PathVariable Long id) {
        try {
            MetadataStatistics stats = DiagramService.getMetadataStatistics(id);
            return new ResponseEntity<>(stats, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Search enhanced diagrams
     */
    @GetMapping("/search")
    @PreAuthorize("hasRole('ROLE_VIEWER') or hasRole('ROLE_MODELER') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<List<DiagramDto>> searchEnhancedDiagrams(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) List<String> tags) {
        try {
            List<DiagramDto> results = DiagramService.searchDiagrams(query, tags);
            return new ResponseEntity<>(results, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // =================== VERSION MANAGEMENT ENDPOINTS ===================

    /**
     * Get all versions of a diagram
     */
    @GetMapping("/{id}/versions")
    @PreAuthorize("hasRole('ROLE_VIEWER') or hasRole('ROLE_MODELER') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<List<DiagramVersionDto>> getDiagramVersions(@PathVariable Long id) {
        try {
            List<DiagramVersion> versions = DiagramService.getDiagramVersions(id);
            List<DiagramVersionDto> versionDtos = versions.stream()
                    .map(this::convertVersionToDto)
                    .toList();
            return new ResponseEntity<>(versionDtos, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Create a new version from current state
     */
    @PostMapping("/{id}/versions")
    @PreAuthorize("hasRole('ROLE_MODELER') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<DiagramVersionDto> createVersion(
            @PathVariable Long id,
            @RequestParam(required = false) String versionNotes) {
        try {
            Optional<DiagramDto> diagramOpt = DiagramService.getDiagramById(id);
            if (!diagramOpt.isPresent()) {
                return new ResponseEntity<>(null, HttpStatus.NOT_FOUND);
            }

            // Convert DTO to entity for version creation
            Diagram diagramEntity = convertDtoToEntity(diagramOpt.get());
            DiagramVersion version = DiagramService.createVersionFromCurrent(diagramEntity);

            if (versionNotes != null && !versionNotes.trim().isEmpty()) {
                version.setVersionNotes(versionNotes);
            }

            DiagramVersionDto versionDto = convertVersionToDto(version);
            return new ResponseEntity<>(versionDto, HttpStatus.CREATED);
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Restore a specific version
     */
    @PostMapping("/{id}/versions/{versionNumber}/restore")
    @PreAuthorize("hasRole('ROLE_MODELER') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<DiagramDto> restoreVersion(
            @PathVariable Long id,
            @PathVariable Integer versionNumber) {
        try {
            DiagramDto restoredDiagram = DiagramService.restoreVersion(id, versionNumber);
            return new ResponseEntity<>(restoredDiagram, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get version comparison data
     */
    @GetMapping("/{id}/versions/compare")
    @PreAuthorize("hasRole('ROLE_VIEWER') or hasRole('ROLE_MODELER') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<VersionComparisonResult> compareVersions(
            @PathVariable Long id,
            @RequestParam Integer version1,
            @RequestParam Integer version2) {
        try {
            // This would require implementing version comparison logic
            VersionComparisonResult result = new VersionComparisonResult();
            result.setDiagramId(id);
            result.setVersion1(version1);
            result.setVersion2(version2);
            result.setHasDifferences(true); // Placeholder
            result.setDifferencesCount(0); // Placeholder

            return new ResponseEntity<>(result, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // =================== HELPER METHODS ===================

    private DiagramVersionDto convertVersionToDto(DiagramVersion version) {
        DiagramVersionDto dto = new DiagramVersionDto();
        dto.setId(version.getId());
        dto.setVersionNumber(version.getVersionNumber());
        dto.setFileName(version.getFileName());
        dto.setDescription(version.getDescription());
        dto.setCreatedTime(version.getCreatedTime());
        dto.setCreatedBy(version.getCreatedBy());
        dto.setVersionNotes(version.getVersionNotes());
        dto.setHasMetadata(version.hasMetadata());
        return dto;
    }

    private Diagram convertDtoToEntity(DiagramDto dto) {
        Diagram entity = new Diagram();
        entity.setId(dto.getId());
        entity.setFileName(dto.getFileName());
        entity.setContent(dto.getContent());
        entity.setDescription(dto.getDescription());
        entity.setCreatedAt(dto.getCreatedAt());
        entity.setUpdatedAt(dto.getUpdatedAt());
        entity.setCreatedBy(dto.getCreatedBy());
        return entity;
    }

    // =================== DTO CLASSES ===================

    public static class ValidationResult {
        private boolean valid;
        private List<String> errors;
        private List<String> warnings;

        public ValidationResult() {}

        public ValidationResult(boolean valid, List<String> errors, List<String> warnings) {
            this.valid = valid;
            this.errors = errors;
            this.warnings = warnings;
        }

        public boolean isValid() { return valid; }
        public void setValid(boolean valid) { this.valid = valid; }

        public List<String> getErrors() { return errors; }
        public void setErrors(List<String> errors) { this.errors = errors; }

        public List<String> getWarnings() { return warnings; }
        public void setWarnings(List<String> warnings) { this.warnings = warnings; }
    }

    public static class MetadataStatistics {
        private int totalElements;
        private int coloredElements;
        private int elementsWithProperties;
        private int totalCustomProperties;
        private String lastModified;
        private String diagramVersion;

        public MetadataStatistics() {}

        public int getTotalElements() { return totalElements; }
        public void setTotalElements(int totalElements) { this.totalElements = totalElements; }

        public int getColoredElements() { return coloredElements; }
        public void setColoredElements(int coloredElements) { this.coloredElements = coloredElements; }

        public int getElementsWithProperties() { return elementsWithProperties; }
        public void setElementsWithProperties(int elementsWithProperties) { this.elementsWithProperties = elementsWithProperties; }

        public int getTotalCustomProperties() { return totalCustomProperties; }
        public void setTotalCustomProperties(int totalCustomProperties) { this.totalCustomProperties = totalCustomProperties; }

        public String getLastModified() { return lastModified; }
        public void setLastModified(String lastModified) { this.lastModified = lastModified; }

        public String getDiagramVersion() { return diagramVersion; }
        public void setDiagramVersion(String diagramVersion) { this.diagramVersion = diagramVersion; }
    }

    public static class DiagramVersionDto {
        private Long id;
        private Integer versionNumber;
        private String fileName;
        private String description;
        private java.time.LocalDateTime createdTime;
        private String createdBy;
        private String versionNotes;
        private boolean hasMetadata;

        // Getters and Setters
        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }

        public Integer getVersionNumber() { return versionNumber; }
        public void setVersionNumber(Integer versionNumber) { this.versionNumber = versionNumber; }

        public String getFileName() { return fileName; }
        public void setFileName(String fileName) { this.fileName = fileName; }

        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }

        public java.time.LocalDateTime getCreatedTime() { return createdTime; }
        public void setCreatedTime(java.time.LocalDateTime createdTime) { this.createdTime = createdTime; }

        public String getCreatedBy() { return createdBy; }
        public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

        public String getVersionNotes() { return versionNotes; }
        public void setVersionNotes(String versionNotes) { this.versionNotes = versionNotes; }

        public boolean isHasMetadata() { return hasMetadata; }
        public void setHasMetadata(boolean hasMetadata) { this.hasMetadata = hasMetadata; }
    }

    public static class VersionComparisonResult {
        private Long diagramId;
        private Integer version1;
        private Integer version2;
        private boolean hasDifferences;
        private int differencesCount;

        // Getters and Setters
        public Long getDiagramId() { return diagramId; }
        public void setDiagramId(Long diagramId) { this.diagramId = diagramId; }

        public Integer getVersion1() { return version1; }
        public void setVersion1(Integer version1) { this.version1 = version1; }

        public Integer getVersion2() { return version2; }
        public void setVersion2(Integer version2) { this.version2 = version2; }

        public boolean isHasDifferences() { return hasDifferences; }
        public void setHasDifferences(boolean hasDifferences) { this.hasDifferences = hasDifferences; }

        public int getDifferencesCount() { return differencesCount; }
        public void setDifferencesCount(int differencesCount) { this.differencesCount = differencesCount; }
    }
}