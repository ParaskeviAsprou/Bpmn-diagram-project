package bpmnProject.akon.bpmnJavaBackend.Diagram;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DiagramVersionRepository extends JpaRepository<DiagramVersion, Long> {

    List<DiagramVersion> findByOriginalDiagramIdOrderByVersionNumberDesc(Long originalDiagramId);

    List<DiagramVersion> findByOriginalDiagramOrderByVersionNumberDesc(Diagram originalDiagram);

    Optional<DiagramVersion> findByOriginalDiagramIdAndVersionNumber(Long originalDiagramId, Integer versionNumber);

    @Query("SELECT MAX(dv.versionNumber) FROM DiagramVersion dv WHERE dv.originalDiagram.id = :diagramId")
    Optional<Integer> findMaxVersionNumberByDiagramId(@Param("diagramId") Long diagramId);

    @Query("SELECT COUNT(dv) FROM DiagramVersion dv WHERE dv.originalDiagram.id = :diagramId")
    Long countVersionsByDiagramId(@Param("diagramId") Long diagramId);

    @Query("SELECT dv FROM DiagramVersion dv WHERE dv.originalDiagram.id = :diagramId ORDER BY dv.createdTime DESC")
    List<DiagramVersion> findByDiagramIdOrderByCreatedTimeDesc(@Param("diagramId") Long diagramId);

    @Query("SELECT dv FROM DiagramVersion dv WHERE dv.createdBy = :createdBy ORDER BY dv.createdTime DESC")
    List<DiagramVersion> findByCreatedByOrderByCreatedTimeDesc(@Param("createdBy") String createdBy);

    @Query("SELECT dv FROM DiagramVersion dv WHERE dv.originalDiagram.id = :diagramId AND dv.versionNotes LIKE %:searchTerm%")
    List<DiagramVersion> findByDiagramIdAndVersionNotesContaining(@Param("diagramId") Long diagramId, @Param("searchTerm") String searchTerm);

    void deleteByOriginalDiagramId(Long originalDiagramId);

    void deleteByOriginalDiagramIdAndVersionNumber(Long originalDiagramId, Integer versionNumber);

    @Query("SELECT dv FROM DiagramVersion dv WHERE dv.originalDiagram.id = :diagramId AND dv.versionNumber BETWEEN :startVersion AND :endVersion ORDER BY dv.versionNumber")
    List<DiagramVersion> findVersionsInRange(@Param("diagramId") Long diagramId, @Param("startVersion") Integer startVersion, @Param("endVersion") Integer endVersion);

    // Statistics queries
    @Query("SELECT COUNT(dv) FROM DiagramVersion dv")
    Long getTotalVersionCount();

    @Query("SELECT COUNT(DISTINCT dv.originalDiagram.id) FROM DiagramVersion dv")
    Long getDiagramsWithVersionsCount();

    @Query("SELECT AVG(sub.versionCount) FROM (SELECT COUNT(dv) as versionCount FROM DiagramVersion dv GROUP BY dv.originalDiagram.id) sub")
    Double getAverageVersionsPerDiagram();
}