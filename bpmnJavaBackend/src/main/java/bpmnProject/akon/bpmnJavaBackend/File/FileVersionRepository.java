package bpmnProject.akon.bpmnJavaBackend.File;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface FileVersionRepository extends JpaRepository<FileVersion, Long> {

    // =================== BASIC VERSION QUERIES ===================

    /**
     * Find all versions for a specific file
     */
    List<FileVersion> findByOriginalFileId(Long originalFileId);

    /**
     * Find all versions for a file ordered by version number (newest first)
     */
    @Query("SELECT fv FROM FileVersion fv WHERE fv.originalFileId = :fileId ORDER BY fv.versionNumber DESC")
    List<FileVersion> findByOriginalFileIdOrderByVersionDesc(@Param("fileId") Long fileId);

    /**
     * Find all versions for a file ordered by version number (newest first) - alternative naming
     */
    @Query("SELECT fv FROM FileVersion fv WHERE fv.originalFileId = :fileId ORDER BY fv.versionNumber DESC")
    List<FileVersion> findByOriginalFileIdOrderByVersionNumberDesc(@Param("fileId") Long fileId);

    /**
     * Find specific version by file ID and version number
     */
    @Query("SELECT fv FROM FileVersion fv WHERE fv.originalFileId = :fileId AND fv.versionNumber = :versionNumber")
    Optional<FileVersion> findByFileIdAndVersion(@Param("fileId") Long fileId, @Param("versionNumber") Integer versionNumber);

    /**
     * Find specific version by file ID and version number - alternative naming
     */
    @Query("SELECT fv FROM FileVersion fv WHERE fv.originalFileId = :fileId AND fv.versionNumber = :versionNumber")
    Optional<FileVersion> findByOriginalFileIdAndVersionNumber(@Param("fileId") Long fileId, @Param("versionNumber") Integer versionNumber);

    // =================== VERSION MANAGEMENT ===================

    /**
     * Find current version for a file
     */
    @Query("SELECT fv FROM FileVersion fv WHERE fv.originalFileId = :fileId AND fv.isCurrent = true")
    Optional<FileVersion> findCurrentVersionByFileId(@Param("fileId") Long fileId);

    /**
     * Get maximum version number for a file
     */
    @Query("SELECT COALESCE(MAX(fv.versionNumber), 0) FROM FileVersion fv WHERE fv.originalFileId = :fileId")
    Integer findMaxVersionByOriginalFileId(@Param("fileId") Long fileId);

    /**
     * Mark all versions as not current for a specific file
     */
    @Modifying
    @Query("UPDATE FileVersion fv SET fv.isCurrent = false WHERE fv.originalFileId = :fileId")
    void markAllVersionsAsNotCurrent(@Param("fileId") Long fileId);

    /**
     * Mark specific version as current
     */
    @Modifying
    @Query("UPDATE FileVersion fv SET fv.isCurrent = :isCurrent WHERE fv.id = :versionId")
    void setVersionCurrentStatus(@Param("versionId") Long versionId, @Param("isCurrent") Boolean isCurrent);

    // =================== STATISTICS AND COUNTS ===================

    /**
     * Count total versions for a file
     */
    @Query("SELECT COUNT(fv) FROM FileVersion fv WHERE fv.originalFileId = :fileId")
    Long countVersionsByFileId(@Param("fileId") Long fileId);

    /**
     * Count versions created by specific user
     */
    @Query("SELECT COUNT(fv) FROM FileVersion fv WHERE fv.originalFileId = :fileId AND fv.createdBy = :userId")
    Long countVersionsByFileIdAndUser(@Param("fileId") Long fileId, @Param("userId") String userId);

    /**
     * Get total storage used by all versions of a file
     */
    @Query("SELECT COALESCE(SUM(fv.fileSize), 0) FROM FileVersion fv WHERE fv.originalFileId = :fileId")
    Long getTotalVersionStorageByFileId(@Param("fileId") Long fileId);

    // =================== DATE-BASED QUERIES ===================

    /**
     * Find versions created after specific date
     */
    @Query("SELECT fv FROM FileVersion fv WHERE fv.originalFileId = :fileId AND fv.createdTime > :date ORDER BY fv.createdTime DESC")
    List<FileVersion> findVersionsCreatedAfter(@Param("fileId") Long fileId, @Param("date") LocalDateTime date);

    /**
     * Find versions created by specific user
     */
    @Query("SELECT fv FROM FileVersion fv WHERE fv.originalFileId = :fileId AND fv.createdBy = :userId ORDER BY fv.versionNumber DESC")
    List<FileVersion> findVersionsByFileIdAndCreatedBy(@Param("fileId") Long fileId, @Param("userId") String userId);

    /**
     * Find versions within date range
     */
    @Query("SELECT fv FROM FileVersion fv WHERE fv.originalFileId = :fileId AND fv.createdTime BETWEEN :startDate AND :endDate ORDER BY fv.createdTime DESC")
    List<FileVersion> findVersionsByDateRange(
            @Param("fileId") Long fileId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );

    // =================== ADVANCED QUERIES ===================

    /**
     * Find latest N versions for a file
     */
    @Query("SELECT fv FROM FileVersion fv WHERE fv.originalFileId = :fileId ORDER BY fv.versionNumber DESC LIMIT :limit")
    List<FileVersion> findLatestVersions(@Param("fileId") Long fileId, @Param("limit") Integer limit);

    /**
     * Find versions larger than specific size
     */
    @Query("SELECT fv FROM FileVersion fv WHERE fv.originalFileId = :fileId AND fv.fileSize > :size ORDER BY fv.versionNumber DESC")
    List<FileVersion> findVersionsLargerThan(@Param("fileId") Long fileId, @Param("size") Integer size);

    /**
     * Find versions with specific notes pattern
     */
    @Query("SELECT fv FROM FileVersion fv WHERE fv.originalFileId = :fileId AND fv.versionNotes LIKE %:notes% ORDER BY fv.versionNumber DESC")
    List<FileVersion> findVersionsByNotesContaining(@Param("fileId") Long fileId, @Param("notes") String notes);

    /**
     * Get version statistics for a file
     */
    @Query("SELECT " +
            "COUNT(fv) as totalVersions, " +
            "MIN(fv.versionNumber) as minVersion, " +
            "MAX(fv.versionNumber) as maxVersion, " +
            "AVG(fv.fileSize) as avgFileSize, " +
            "SUM(fv.fileSize) as totalSize " +
            "FROM FileVersion fv WHERE fv.originalFileId = :fileId")
    Object[] getVersionStatistics(@Param("fileId") Long fileId);

    // =================== CLEANUP OPERATIONS ===================

    /**
     * Delete all versions for a file (cascade delete)
     */
    @Modifying
    @Query("DELETE FROM FileVersion fv WHERE fv.originalFileId = :fileId")
    void deleteAllVersionsByFileId(@Param("fileId") Long fileId);

    /**
     * Delete versions older than specific date
     */
    @Modifying
    @Query("DELETE FROM FileVersion fv WHERE fv.originalFileId = :fileId AND fv.createdTime < :date AND fv.isCurrent = false")
    void deleteVersionsOlderThan(@Param("fileId") Long fileId, @Param("date") LocalDateTime date);

    /**
     * Delete specific version numbers (keep current)
     */
    @Modifying
    @Query("DELETE FROM FileVersion fv WHERE fv.originalFileId = :fileId AND fv.versionNumber < :versionNumber AND fv.isCurrent = false")
    void deleteVersionsBeforeVersion(@Param("fileId") Long fileId, @Param("versionNumber") Integer versionNumber);

    // =================== GLOBAL QUERIES ===================

    /**
     * Find all current versions across all files
     */
    @Query("SELECT fv FROM FileVersion fv WHERE fv.isCurrent = true")
    List<FileVersion> findAllCurrentVersions();

    /**
     * Find versions by created user across all files
     */
    @Query("SELECT fv FROM FileVersion fv WHERE fv.createdBy = :userId ORDER BY fv.createdTime DESC")
    List<FileVersion> findVersionsByCreatedBy(@Param("userId") String userId);

    /**
     * Get total storage used by all versions
     */
    @Query("SELECT COALESCE(SUM(fv.fileSize), 0) FROM FileVersion fv")
    Long getTotalVersionStorage();

    /**
     * Find most recent versions across all files
     */
    @Query("SELECT fv FROM FileVersion fv ORDER BY fv.createdTime DESC")
    List<FileVersion> findAllVersionsByDateDesc();

    // =================== FILE TYPE SPECIFIC ===================

    /**
     * Find BPMN versions specifically
     */
    @Query("SELECT fv FROM FileVersion fv WHERE fv.fileType = 'bpmn' OR fv.fileName LIKE '%.bpmn' ORDER BY fv.createdTime DESC")
    List<FileVersion> findBpmnVersions();

    /**
     * Find versions with custom properties
     */
    @Query("SELECT fv FROM FileVersion fv WHERE fv.customProperties IS NOT NULL AND fv.customProperties != '{}' ORDER BY fv.createdTime DESC")
    List<FileVersion> findVersionsWithCustomProperties();

    /**
     * Find versions with element colors
     */
    @Query("SELECT fv FROM FileVersion fv WHERE fv.elementColors IS NOT NULL AND fv.elementColors != '{}' ORDER BY fv.createdTime DESC")
    List<FileVersion> findVersionsWithElementColors();
}