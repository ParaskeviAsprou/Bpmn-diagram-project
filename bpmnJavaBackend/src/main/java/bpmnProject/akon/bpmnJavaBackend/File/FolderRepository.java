package bpmnProject.akon.bpmnJavaBackend.File;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FolderRepository extends JpaRepository<Folder, Long> {

    // =================== SIMPLIFIED FOLDER QUERIES ===================

    /**
     * Check if folder exists by name (simplified - no parent folders)
     */
    boolean existsByFolderName(String folderName);

    /**
     * Find all folders ordered by name (simplified - no hierarchy)
     */
    List<Folder> findAllByOrderByFolderNameAsc();

    /**
     * Find folder by name
     */
    Optional<Folder> findByFolderName(String folderName);

    /**
     * Find folders created by user
     */
    List<Folder> findByCreatedByOrderByCreatedTimeDesc(String createdBy);

    /**
     * Find folders containing a search term in name or description
     */
    @Query("SELECT f FROM Folder f WHERE " +
            "LOWER(f.folderName) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
            "LOWER(f.description) LIKE LOWER(CONCAT('%', :searchTerm, '%'))")
    List<Folder> findBySearchTerm(@Param("searchTerm") String searchTerm);

    /**
     * Find folders ordered by creation time
     */
    List<Folder> findAllByOrderByCreatedTimeDesc();

    /**
     * Find folders ordered by update time
     */
    List<Folder> findAllByOrderByUpdatedTimeDesc();

    /**
     * Count total folders
     */
    @Query("SELECT COUNT(f) FROM Folder f")
    long countAllFolders();

    /**
     * Count folders by creator
     */
    long countByCreatedBy(String createdBy);

    // =================== FOLDER STATISTICS ===================

    /**
     * Get folder with file count
     */
    @Query("SELECT f, COUNT(file) FROM Folder f LEFT JOIN f.files file WHERE f.id = :folderId GROUP BY f")
    Object[] findFolderWithFileCount(@Param("folderId") Long folderId);

    /**
     * Get all folders with their file counts
     */
    @Query("SELECT f, COUNT(file) FROM Folder f LEFT JOIN f.files file GROUP BY f ORDER BY f.folderName")
    List<Object[]> findAllFoldersWithFileCounts();

    /**
     * Find folders with no files (empty folders)
     */
    @Query("SELECT f FROM Folder f WHERE f.id NOT IN " +
            "(SELECT DISTINCT file.folderId FROM File file WHERE file.folderId IS NOT NULL)")
    List<Folder> findEmptyFolders();

    /**
     * Find folders with files
     */
    @Query("SELECT DISTINCT f FROM Folder f JOIN f.files file")
    List<Folder> findFoldersWithFiles();

    // =================== FOLDER OPERATIONS ===================

    /**
     * Delete folder by name
     */
    void deleteByFolderName(String folderName);

    /**
     * Find folders modified after a certain date
     */
    @Query("SELECT f FROM Folder f WHERE f.updatedTime > :date ORDER BY f.updatedTime DESC")
    List<Folder> findFoldersModifiedAfter(@Param("date") java.time.LocalDateTime date);

    /**
     * Find recently created folders (last N days)
     */
    @Query("SELECT f FROM Folder f WHERE f.createdTime > :date ORDER BY f.createdTime DESC")
    List<Folder> findRecentlyCreatedFolders(@Param("date") java.time.LocalDateTime date);

    // =================== VALIDATION METHODS ===================

    /**
     * Check if folder name exists (case-insensitive)
     */
    @Query("SELECT CASE WHEN COUNT(f) > 0 THEN true ELSE false END FROM Folder f WHERE LOWER(f.folderName) = LOWER(:folderName)")
    boolean existsByFolderNameIgnoreCase(@Param("folderName") String folderName);

    /**
     * Find folder by name (case-insensitive)
     */
    @Query("SELECT f FROM Folder f WHERE LOWER(f.folderName) = LOWER(:folderName)")
    Optional<Folder> findByFolderNameIgnoreCase(@Param("folderName") String folderName);
}