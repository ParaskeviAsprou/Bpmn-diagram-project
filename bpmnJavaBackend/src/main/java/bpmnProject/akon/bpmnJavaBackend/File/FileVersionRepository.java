package bpmnProject.akon.bpmnJavaBackend.File;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FileVersionRepository extends JpaRepository<FileVersion, Long> {

    List<FileVersion> findByOriginalFileIdOrderByVersionNumberDesc(Long originalFileId);

    List<FileVersion> findByOriginalFileOrderByVersionNumberDesc(File originalFile);

    Optional<FileVersion> findByOriginalFileIdAndVersionNumber(Long originalFileId, Integer versionNumber);

    @Query("SELECT fv FROM FileVersion fv WHERE fv.originalFile.id = :fileId AND fv.isCurrent = true")
    Optional<FileVersion> findCurrentVersion(@Param("fileId") Long fileId);

    @Query("SELECT COUNT(fv) FROM FileVersion fv WHERE fv.originalFile.id = :fileId")
    Long countVersionsByFileId(@Param("fileId") Long fileId);

    void deleteByOriginalFileId(Long originalFileId);
}
