package bpmnProject.akon.bpmnJavaBackend.Diagram;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DiagramRepository extends JpaRepository<Diagram, Long> {

    List<Diagram> findByCreatedByOrderByUpdatedAtDesc(String createdBy);

    List<Diagram> findByFileNameContainingIgnoreCase(String fileName);

    List<Diagram> findByTagsContaining(String tag);

    // Fixed: Use entity name 'Diagram' instead of table name 'diagram'
    @Query("SELECT d FROM Diagram d WHERE d.createdBy = :createdBy AND d.fileName LIKE %:fileName%")
    List<Diagram> findByCreatedByAndFileNameContainingIgnoreCase(@Param("createdBy") String createdBy, @Param("fileName") String fileName);

    @Query("SELECT d FROM Diagram d WHERE d.createdBy = :createdBy AND (d.fileName LIKE %:searchTerm% OR d.description LIKE %:searchTerm% OR d.tags LIKE %:searchTerm%)")
    List<Diagram> findByCreatedByAndSearchTerm(@Param("createdBy") String createdBy, @Param("searchTerm") String searchTerm);

    // Find accessible diagrams (public + owned)
    @Query("SELECT d FROM Diagram d WHERE d.createdBy = :createdBy OR d.id IN (SELECT d2.id FROM Diagram d2 WHERE d2.createdBy != :createdBy)")
    List<Diagram> findAccessibleDiagrams(@Param("createdBy") String createdBy);

    // Search by multiple criteria
    @Query("SELECT d FROM Diagram d WHERE d.createdBy = :createdBy AND " +
            "(:fileName IS NULL OR d.fileName LIKE %:fileName%) AND " +
            "(:description IS NULL OR d.description LIKE %:description%) AND " +
            "(:tags IS NULL OR d.tags LIKE %:tags%)")
    List<Diagram> findByMultipleCriteria(@Param("createdBy") String createdBy,
                                         @Param("fileName") String fileName,
                                         @Param("description") String description,
                                         @Param("tags") String tags);

    // Recent diagrams
    @Query("SELECT d FROM Diagram d WHERE d.createdBy = :createdBy ORDER BY d.updatedAt DESC")
    List<Diagram> findRecentDiagrams(@Param("createdBy") String createdBy);

    // Count user diagrams
    @Query("SELECT COUNT(d) FROM Diagram d WHERE d.createdBy = :createdBy")
    Long countByCreatedBy(@Param("createdBy") String createdBy);

    // Find by date range
    @Query("SELECT d FROM Diagram d WHERE d.createdBy = :createdBy AND d.createdAt BETWEEN :startDate AND :endDate")
    List<Diagram> findByCreatedByAndDateRange(@Param("createdBy") String createdBy,
                                              @Param("startDate") java.time.LocalDateTime startDate,
                                              @Param("endDate") java.time.LocalDateTime endDate);

    // Check if diagram exists by name for user
    @Query("SELECT COUNT(d) > 0 FROM Diagram d WHERE d.createdBy = :createdBy AND d.fileName = :fileName")
    boolean existsByCreatedByAndFileName(@Param("createdBy") String createdBy, @Param("fileName") String fileName);

    // Find diagrams with versions
    @Query("SELECT d FROM Diagram d WHERE SIZE(d.versions) > 0")
    List<Diagram> findDiagramsWithVersions();

    // Find diagrams without versions
    @Query("SELECT d FROM Diagram d WHERE SIZE(d.versions) = 0")
    List<Diagram> findDiagramsWithoutVersions();

    // Advanced search
    @Query("SELECT d FROM Diagram d WHERE d.createdBy = :createdBy AND " +
            "(:searchTerm IS NULL OR " +
            "LOWER(d.fileName) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
            "LOWER(d.description) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
            "LOWER(d.tags) LIKE LOWER(CONCAT('%', :searchTerm, '%'))) " +
            "ORDER BY d.updatedAt DESC")
    List<Diagram> advancedSearch(@Param("createdBy") String createdBy, @Param("searchTerm") String searchTerm);
}