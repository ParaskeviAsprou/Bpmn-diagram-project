package bpmnProject.akon.bpmnJavaBackend.File;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FileRepository extends JpaRepository<File, Long> {

    // =================== BASIC QUERIES ===================

    /**
     * Find files by creator
     */
    List<File> findByCreatedBy(String createdBy);

    /**
     * Find files by file type
     */
    List<File> findByFileType(String fileType);

    /**
     * Find files by folder ID
     */
    List<File> findByFolderId(Long folderId);

    /**
     * Find files by name containing (search)
     */
    @Query("SELECT f FROM File f WHERE f.fileName LIKE %:name%")
    List<File> findByFileNameContaining(@Param("name") String name);

    // =================== FILE NAME QUERIES ===================

    /**
     * Find file by exact file name
     */
    Optional<File> findByFileName(String fileName);

    /**
     * Find file by name in root folder (no folder)
     */
    Optional<File> findByFileNameAndFolderIsNull(String fileName);

    /**
     * Find file by name in specific folder
     */
    Optional<File> findByFileNameAndFolderId(String fileName, Long folderId);

    // =================== FOLDER-BASED QUERIES ===================

    /**
     * Find files in root folder (no folder) ordered by upload time
     */
    List<File> findByFolderIsNullOrderByUploadTimeDesc();

    /**
     * Find files in specific folder ordered by upload time
     */
    List<File> findByFolderIdOrderByUploadTimeDesc(Long folderId);

    /**
     * Find files in root folder (no folder) ordered by name
     */
    List<File> findByFolderIsNullOrderByFileName();

    /**
     * Find files in specific folder ordered by name
     */
    List<File> findByFolderIdOrderByFileName(Long folderId);

    // =================== ADVANCED QUERIES ===================

    /**
     * Find files by multiple criteria
     */
    @Query("SELECT f FROM File f WHERE " +
            "(:fileName IS NULL OR f.fileName LIKE %:fileName%) AND " +
            "(:fileType IS NULL OR f.fileType = :fileType) AND " +
            "(:folderId IS NULL OR f.folderId = :folderId) AND " +
            "(:createdBy IS NULL OR f.createdBy = :createdBy)")
    List<File> findByMultipleCriteria(
            @Param("fileName") String fileName,
            @Param("fileType") String fileType,
            @Param("folderId") Long folderId,
            @Param("createdBy") String createdBy
    );

    /**
     * Find BPMN files specifically
     */
    @Query("SELECT f FROM File f WHERE f.fileType = 'bpmn' OR f.fileName LIKE '%.bpmn' OR f.fileName LIKE '%.xml'")
    List<File> findBpmnFiles();

    /**
     * Find files by tags
     */
    @Query("SELECT f FROM File f WHERE f.tags LIKE %:tag%")
    List<File> findByTagsContaining(@Param("tag") String tag);

    /**
     * Count files in folder
     */
    @Query("SELECT COUNT(f) FROM File f WHERE f.folderId = :folderId")
    Long countFilesByFolderId(@Param("folderId") Long folderId);

    /**
     * Count files in root folder
     */
    @Query("SELECT COUNT(f) FROM File f WHERE f.folderId IS NULL")
    Long countRootFiles();

    /**
     * Find recent files (last N files)
     */
    @Query("SELECT f FROM File f ORDER BY f.updatedTime DESC")
    List<File> findRecentFiles();

    /**
     * Find files larger than specified size
     */
    @Query("SELECT f FROM File f WHERE f.fileSize > :size")
    List<File> findFilesLargerThan(@Param("size") Long size);

    /**
     * Find files by date range
     */
    @Query("SELECT f FROM File f WHERE f.uploadTime BETWEEN :startDate AND :endDate")
    List<File> findFilesByDateRange(
            @Param("startDate") java.time.LocalDateTime startDate,
            @Param("endDate") java.time.LocalDateTime endDate
    );

    /**
     * Get total storage used by user
     */
    @Query("SELECT COALESCE(SUM(f.fileSize), 0) FROM File f WHERE f.createdBy = :userId")
    Long getTotalStorageByUser(@Param("userId") String userId);

    /**
     * Find duplicate file names
     */
    @Query("SELECT f.fileName FROM File f GROUP BY f.fileName HAVING COUNT(f) > 1")
    List<String> findDuplicateFileNames();

    // =================== VERSION-RELATED QUERIES ===================

    /**
     * Find files with highest version numbers
     */
    @Query("SELECT f FROM File f ORDER BY f.currentVersion DESC")
    List<File> findFilesByVersionDesc();

    /**
     * Find files with specific version number
     */
    @Query("SELECT f FROM File f WHERE f.currentVersion = :version")
    List<File> findByCurrentVersion(@Param("version") Integer version);
}