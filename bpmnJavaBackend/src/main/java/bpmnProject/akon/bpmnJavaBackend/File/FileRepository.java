package bpmnProject.akon.bpmnJavaBackend.File;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FileRepository extends JpaRepository<File, Long> {

    Optional<File> findByFileName(String fileName);

    void deleteByFileName(String fileName);

    // Folder-related queries
    List<File> findByFolderIsNullOrderByUploadTimeDesc();

    List<File> findByFolderIdOrderByUploadTimeDesc(Long folderId);

    List<File> findByFolderOrderByUploadTimeDesc(Folder folder);

    @Query("SELECT f FROM File f WHERE f.folder.id = :folderId OR f.folder IS NULL ORDER BY f.uploadTime DESC")
    List<File> findByFolderIdIncludingRoot(@Param("folderId") Long folderId);

    // Search queries
    @Query("SELECT f FROM File f WHERE f.fileName LIKE %:search% OR f.description LIKE %:search% OR f.tags LIKE %:search%")
    List<File> searchFiles(@Param("search") String search);

    @Query("SELECT f FROM File f WHERE (f.fileName LIKE %:search% OR f.description LIKE %:search% OR f.tags LIKE %:search%) AND f.folder.id = :folderId")
    List<File> searchFilesInFolder(@Param("search") String search, @Param("folderId") Long folderId);

    // Template and public files
    @Query("SELECT f FROM File f WHERE f.isTemplate = true ORDER BY f.uploadTime DESC")
    List<File> findTemplateFiles();

    @Query("SELECT f FROM File f WHERE f.isPublic = true ORDER BY f.uploadTime DESC")
    List<File> findPublicFiles();

    // User-specific queries
    @Query("SELECT f FROM File f WHERE f.createdBy = :createdBy ORDER BY f.uploadTime DESC")
    List<File> findByCreatedByOrderByUploadTimeDesc(@Param("createdBy") String createdBy);

    // Tag queries
    @Query("SELECT f FROM File f WHERE f.tags LIKE %:tag%")
    List<File> findByTag(@Param("tag") String tag);

    // File type queries
    @Query("SELECT f FROM File f WHERE f.fileType LIKE %:fileType%")
    List<File> findByFileTypeContaining(@Param("fileType") String fileType);

    // BPMN specific queries
    @Query("SELECT f FROM File f WHERE f.fileName LIKE '%.bpmn' OR f.fileName LIKE '%.xml' OR f.fileType LIKE '%xml%'")
    List<File> findBpmnFiles();

    // Statistics queries
    @Query("SELECT COUNT(f) FROM File f WHERE f.folder.id = :folderId")
    Long countByFolderId(@Param("folderId") Long folderId);

    @Query("SELECT SUM(f.fileSize) FROM File f WHERE f.folder.id = :folderId")
    Long sumFileSizeByFolderId(@Param("folderId") Long folderId);

    // Recent files
    @Query("SELECT f FROM File f ORDER BY f.updatedTime DESC")
    List<File> findRecentFiles();

    @Query("SELECT f FROM File f WHERE f.createdBy = :createdBy ORDER BY f.updatedTime DESC")
    List<File> findRecentFilesByUser(@Param("createdBy") String createdBy);
}