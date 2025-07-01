package bpmnProject.akon.bpmnJavaBackend.Diagram;

import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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

    // DTO classes for validation and statistics
    public static class ValidationResult {
        private boolean valid;
        private List<String> errors;
        private List<String> warnings;

        // Constructors, getters, and setters
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

        // Constructors, getters, and setters
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
}
