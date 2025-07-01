package bpmnProject.akon.bpmnJavaBackend.Diagram;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import bpmnProject.akon.bpmnJavaBackend.DtoClasses.DiagramDto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

@Service
@Transactional
public class DiagramService {
    @Autowired
    private DiagramRepository repository;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private DiagramVersionRepository versionRepository;

    /**
     * Save diagram with automatic versioning
     */
    public DiagramDto saveDiagram(DiagramDto dto) {
        try {
            Diagram entity;
            boolean isUpdate = dto.getId() != null;
            boolean shouldCreateVersion = false;

            if (isUpdate) {
                entity = repository.findById(dto.getId())
                        .orElseThrow(() -> new RuntimeException("Diagram not found with id: " + dto.getId()));

                // Check if content has changed to determine if we need a version
                shouldCreateVersion = hasContentChanged(entity, dto);

                if (shouldCreateVersion) {
                    // Create version before updating
                    createVersionFromCurrent(entity);
                }
            } else {
                entity = new Diagram();
                entity.setCreatedBy(getCurrentUsername());
                entity.setCreatedAt(LocalDateTime.now());
            }

            // Update entity with new data
            updateEntityFromDto(entity, dto);
            entity.setUpdatedAt(LocalDateTime.now());
            entity.setUpdatedBy(getCurrentUsername());

            Diagram saved = repository.save(entity);
            DiagramDto result = convertToDto(saved);

            // Add version count
            result.setVersionCount(getVersionCount(saved.getId()));
            result.setHasVersions(result.getVersionCount() > 0);

            return result;

        } catch (Exception e) {
            throw new RuntimeException("Error saving diagram: " + e.getMessage(), e);
        }
    }

    /**
     * Update existing diagram with version control
     */
    public DiagramDto updateDiagram(DiagramDto dto) {
        if (dto.getId() == null) {
            throw new RuntimeException("Diagram ID is required for update");
        }

        // Force create version for explicit updates
        return saveDiagram(dto);
    }

    /**
     * Get diagram by ID with version information
     */
    public Optional<DiagramDto> getDiagramById(Long id) {
        return repository.findById(id)
                .map(diagram -> {
                    DiagramDto dto = convertToDto(diagram);
                    dto.setVersionCount(getVersionCount(id));
                    dto.setHasVersions(dto.getVersionCount() > 0);
                    return dto;
                });
    }

    /**
     * Get all diagrams for current user with version information
     */
    public List<DiagramDto> getAllDiagramsForCurrentUser() {
        String currentUser = getCurrentUsername();
        return repository.findByCreatedByOrderByUpdatedAtDesc(currentUser)
                .stream()
                .map(diagram -> {
                    DiagramDto dto = convertToDto(diagram);
                    dto.setVersionCount(getVersionCount(diagram.getId()));
                    dto.setHasVersions(dto.getVersionCount() > 0);
                    return dto;
                })
                .collect(Collectors.toList());
    }

    /**
     * Delete diagram and all its versions
     */
    public boolean deleteDiagram(Long id) {
        try {
            if (repository.existsById(id)) {
                // Delete all versions first
                versionRepository.deleteByOriginalDiagramId(id);
                // Delete the diagram
                repository.deleteById(id);
                return true;
            }
            return false;
        } catch (Exception e) {
            throw new RuntimeException("Error deleting diagram: " + e.getMessage(), e);
        }
    }

    /**
     * Search diagrams with filters
     */
    public List<DiagramDto> searchDiagrams(String query, List<String> tags) {
        String currentUser = getCurrentUsername();

        List<Diagram> diagrams;
        if (query != null && !query.trim().isEmpty()) {
            diagrams = repository.advancedSearch(currentUser, query.trim());
        } else {
            diagrams = repository.findByCreatedByOrderByUpdatedAtDesc(currentUser);
        }

        return diagrams.stream()
                .map(diagram -> {
                    DiagramDto dto = convertToDto(diagram);
                    dto.setVersionCount(getVersionCount(diagram.getId()));
                    dto.setHasVersions(dto.getVersionCount() > 0);
                    return dto;
                })
                .collect(Collectors.toList());
    }

    // ================= VERSION MANAGEMENT =================

    /**
     * Create version from current diagram state
     */
    public DiagramVersion createVersionFromCurrent(Diagram currentDiagram) {
        try {
            DiagramVersion version = new DiagramVersion();
            version.setOriginalDiagram(currentDiagram);
            version.setVersionNumber(getNextVersionNumber(currentDiagram.getId()));
            version.setFileName(currentDiagram.getFileName());
            version.setContent(currentDiagram.getContent());
            version.setMetadata(currentDiagram.getMetadata());
            version.setDescription(currentDiagram.getDescription());
            version.setTags(currentDiagram.getTags());
            version.setCreatedTime(LocalDateTime.now());
            version.setCreatedBy(getCurrentUsername());

            // Generate meaningful version notes
            version.setVersionNotes(generateVersionNotes(currentDiagram));

            DiagramVersion saved = versionRepository.save(version);

            // Update diagram version count
            currentDiagram.setVersions(versionRepository.findByOriginalDiagramIdOrderByVersionNumberDesc(currentDiagram.getId()));

            return saved;
        } catch (Exception e) {
            throw new RuntimeException("Error creating version: " + e.getMessage(), e);
        }
    }

    /**
     * Get all versions of a diagram
     */
    public List<DiagramVersion> getDiagramVersions(Long diagramId) {
        return versionRepository.findByOriginalDiagramIdOrderByVersionNumberDesc(diagramId);
    }

    /**
     * Restore specific version
     */
    public DiagramDto restoreVersion(Long diagramId, Integer versionNumber) {
        try {
            Diagram originalDiagram = repository.findById(diagramId)
                    .orElseThrow(() -> new RuntimeException("Diagram not found"));

            DiagramVersion versionToRestore = versionRepository
                    .findByOriginalDiagramIdAndVersionNumber(diagramId, versionNumber)
                    .orElseThrow(() -> new RuntimeException("Version not found"));

            // Create version from current state before restoring
            createVersionFromCurrent(originalDiagram);

            // Restore the version data
            originalDiagram.setContent(versionToRestore.getContent());
            originalDiagram.setMetadata(versionToRestore.getMetadata());
            originalDiagram.setDescription(versionToRestore.getDescription());
            originalDiagram.setTags(versionToRestore.getTags());
            originalDiagram.setUpdatedAt(LocalDateTime.now());
            originalDiagram.setUpdatedBy(getCurrentUsername());

            Diagram saved = repository.save(originalDiagram);
            DiagramDto result = convertToDto(saved);
            result.setVersionCount(getVersionCount(saved.getId()));
            result.setHasVersions(result.getVersionCount() > 0);

            return result;
        } catch (Exception e) {
            throw new RuntimeException("Error restoring version: " + e.getMessage(), e);
        }
    }

    /**
     * Get version count for a diagram
     */
    public Integer getVersionCount(Long diagramId) {
        return versionRepository.countVersionsByDiagramId(diagramId).intValue();
    }

    /**
     * Get next version number
     */
    private Integer getNextVersionNumber(Long diagramId) {
        return versionRepository.findMaxVersionNumberByDiagramId(diagramId)
                .map(max -> max + 1)
                .orElse(1);
    }

    /**
     * Check if content has changed significantly
     */
    private boolean hasContentChanged(Diagram existing, DiagramDto dto) {
        // Check if XML content changed
        boolean contentChanged = !existing.getContent().equals(dto.getContent());

        // Check if metadata changed
        boolean metadataChanged = false;
        try {
            String existingMetadata = existing.getMetadata();
            String newMetadata = dto.getMetadata() != null ?
                    objectMapper.writeValueAsString(dto.getMetadata()) : null;

            metadataChanged = !java.util.Objects.equals(existingMetadata, newMetadata);
        } catch (Exception e) {
            // If we can't compare metadata, assume it changed
            metadataChanged = true;
        }

        // Check if description or tags changed
        boolean descriptionChanged = !java.util.Objects.equals(existing.getDescription(), dto.getDescription());
        boolean tagsChanged = !java.util.Objects.equals(existing.getTags(),
                dto.getTags() != null ? String.join(",", dto.getTags()) : null);

        return contentChanged || metadataChanged || descriptionChanged || tagsChanged;
    }

    /**
     * Generate meaningful version notes
     */
    private String generateVersionNotes(Diagram diagram) {
        StringBuilder notes = new StringBuilder();
        notes.append("Auto-saved version created on ").append(LocalDateTime.now());

        if (diagram.getMetadata() != null) {
            try {
                com.fasterxml.jackson.databind.JsonNode metadata = objectMapper.readTree(diagram.getMetadata());

                // Count elements with colors
                if (metadata.has("elementColors")) {
                    int coloredElements = metadata.get("elementColors").size();
                    if (coloredElements > 0) {
                        notes.append(" | ").append(coloredElements).append(" colored elements");
                    }
                }

                // Count custom properties
                if (metadata.has("customProperties")) {
                    int elementsWithProps = metadata.get("customProperties").size();
                    if (elementsWithProps > 0) {
                        notes.append(" | ").append(elementsWithProps).append(" elements with properties");
                    }
                }
            } catch (Exception e) {
                // Ignore metadata parsing errors for version notes
            }
        }

        return notes.toString();
    }

    // ================= VALIDATION AND STATISTICS =================

    public DiagramController.ValidationResult validateDiagramMetadata(Long id) {
        try {
            Optional<Diagram> diagramOpt = repository.findById(id);
            if (!diagramOpt.isPresent()) {
                return new DiagramController.ValidationResult(false,
                        List.of("Diagram not found"), List.of());
            }

            Diagram diag = diagramOpt.get();
            List<String> errors = new java.util.ArrayList<>();
            List<String> warnings = new java.util.ArrayList<>();

            // Validate content
            if (diag.getContent() == null || diag.getContent().trim().isEmpty()) {
                errors.add("Diagram content is empty");
            }

            // Validate metadata JSON
            if (diag.getMetadata() != null && !diag.getMetadata().trim().isEmpty()) {
                try {
                    objectMapper.readTree(diag.getMetadata());
                } catch (Exception e) {
                    errors.add("Invalid metadata JSON format: " + e.getMessage());
                }
            }

            // Validate BPMN XML structure
            if (diag.getContent() != null) {
                if (!diag.getContent().contains("bpmn:definitions")) {
                    errors.add("Invalid BPMN format - missing bpmn:definitions");
                }
                if (!diag.getContent().contains("<?xml")) {
                    warnings.add("Missing XML declaration");
                }
                if (!diag.getContent().contains("xmlns:bpmn")) {
                    errors.add("Missing BPMN namespace declaration");
                }
            }

            // Check for version history
            int versionCount = getVersionCount(diag.getId());
            if (versionCount > 10) {
                warnings.add("Diagram has many versions (" + versionCount + ") - consider cleanup");
            }

            return new DiagramController.ValidationResult(errors.isEmpty(), errors, warnings);
        } catch (Exception e) {
            return new DiagramController.ValidationResult(false,
                    List.of("Validation error: " + e.getMessage()), List.of());
        }
    }

    public DiagramController.MetadataStatistics getMetadataStatistics(Long id) {
        try {
            Optional<Diagram> diagramOpt = repository.findById(id);
            if (!diagramOpt.isPresent()) {
                throw new RuntimeException("Diagram not found");
            }

            Diagram diag = diagramOpt.get();
            DiagramController.MetadataStatistics stats = new DiagramController.MetadataStatistics();

            stats.setLastModified(diag.getUpdatedAt() != null ? diag.getUpdatedAt().toString() : "Unknown");
            stats.setDiagramVersion("2.0");

            if (diag.getMetadata() != null && !diag.getMetadata().trim().isEmpty()) {
                try {
                    com.fasterxml.jackson.databind.JsonNode metadata = objectMapper.readTree(diag.getMetadata());

                    // Count colored elements
                    if (metadata.has("elementColors")) {
                        stats.setColoredElements(metadata.get("elementColors").size());
                    }

                    // Count elements with properties and total properties
                    int elementsWithProps = 0;
                    AtomicInteger totalCustomProps = new AtomicInteger();
                    if (metadata.has("customProperties")) {
                        com.fasterxml.jackson.databind.JsonNode customProps = metadata.get("customProperties");
                        elementsWithProps = customProps.size();

                        // Count total properties across all elements
                        customProps.fields().forEachRemaining(entry -> {
                            if (entry.getValue().isArray()) {
                                totalCustomProps.addAndGet(entry.getValue().size());
                            }
                        });
                    }

                    stats.setElementsWithProperties(elementsWithProps);
                    stats.setTotalCustomProperties(totalCustomProps.get());

                } catch (Exception e) {
                    // If metadata parsing fails, set defaults
                    stats.setColoredElements(0);
                    stats.setElementsWithProperties(0);
                    stats.setTotalCustomProperties(0);
                }
            } else {
                stats.setColoredElements(0);
                stats.setElementsWithProperties(0);
                stats.setTotalCustomProperties(0);
            }

            // Estimate total elements from BPMN content
            if (diag.getContent() != null) {
                // Count BPMN elements more accurately
                String[] bpmnElements = {"task", "event", "gateway", "sequenceFlow", "dataObject", "pool", "lane"};
                int elementCount = 0;
                String content = diag.getContent().toLowerCase();

                for (String element : bpmnElements) {
                    elementCount += countOccurrences(content, "bpmn:" + element);
                }

                stats.setTotalElements(Math.max(elementCount, 1));
            } else {
                stats.setTotalElements(0);
            }

            return stats;
        } catch (Exception e) {
            throw new RuntimeException("Error getting metadata statistics: " + e.getMessage(), e);
        }
    }

    // ================= HELPER METHODS =================

    /**
     * Update entity from DTO with proper metadata handling
     */
    private void updateEntityFromDto(Diagram entity, DiagramDto dto) throws Exception {
        entity.setFileName(dto.getFileName());
        entity.setContent(dto.getContent());
        entity.setDescription(dto.getDescription());
        entity.setTags(dto.getTags() != null ? String.join(",", dto.getTags()) : null);

        // Convert metadata to JSON string with proper error handling
        if (dto.getMetadata() != null) {
            try {
                String metadataJson = objectMapper.writeValueAsString(dto.getMetadata());
                entity.setMetadata(metadataJson);
            } catch (Exception e) {
                throw new RuntimeException("Failed to serialize metadata: " + e.getMessage(), e);
            }
        }
    }

    /**
     * Convert entity to DTO with proper metadata handling
     */
    private DiagramDto convertToDto(Diagram entity) {
        try {
            DiagramDto dto = new DiagramDto();
            dto.setId(entity.getId());
            dto.setFileName(entity.getFileName());
            dto.setContent(entity.getContent());
            dto.setDescription(entity.getDescription());
            dto.setCreatedAt(entity.getCreatedAt());
            dto.setUpdatedAt(entity.getUpdatedAt());
            dto.setCreatedBy(entity.getCreatedBy());
            dto.setUpdatedBy(entity.getUpdatedBy());

            // Parse tags
            if (entity.getTags() != null && !entity.getTags().isEmpty()) {
                dto.setTags(List.of(entity.getTags().split(",")));
            }

            // Parse metadata with error handling
            if (entity.getMetadata() != null && !entity.getMetadata().trim().isEmpty()) {
                try {
                    DiagramDto.DiagramMetadataDto metadata = objectMapper.readValue(
                            entity.getMetadata(), DiagramDto.DiagramMetadataDto.class);
                    dto.setMetadata(metadata);
                } catch (Exception e) {
                    // Log the error but don't fail the conversion
                    System.err.println("Warning: Failed to parse metadata for diagram " + entity.getId() + ": " + e.getMessage());
                    dto.setMetadata(new DiagramDto.DiagramMetadataDto());
                }
            } else {
                dto.setMetadata(new DiagramDto.DiagramMetadataDto());
            }

            return dto;
        } catch (Exception e) {
            throw new RuntimeException("Error converting entity to DTO: " + e.getMessage(), e);
        }
    }

    /**
     * Get current authenticated username
     */
    private String getCurrentUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication != null ? authentication.getName() : "system";
    }

    /**
     * Count occurrences of substring in string
     */
    private int countOccurrences(String text, String substring) {
        int count = 0;
        int index = 0;
        while ((index = text.indexOf(substring, index)) != -1) {
            count++;
            index += substring.length();
        }
        return count;
    }

    /**
     * Check if user owns the diagram
     */
    public boolean isOwner(Long diagramId) {
        return repository.findById(diagramId)
                .map(diagram -> diagram.getCreatedBy().equals(getCurrentUsername()))
                .orElse(false);
    }
}