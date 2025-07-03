package bpmnProject.akon.bpmnJavaBackend.File;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FolderRepository extends JpaRepository<Folder, Long> {

    // Basic folder queries
    List<Folder> findByParentFolderIsNullOrderByFolderNameAsc();
    List<Folder> findByParentFolderIdOrderByFolderNameAsc(Long parentFolderId);
    List<Folder> findByParentFolderOrderByFolderNameAsc(Folder parentFolder);

    // Name-based queries
    Optional<Folder> findByFolderNameAndParentFolder(String folderName, Folder parentFolder);
    Optional<Folder> findByFolderNameAndParentFolderIsNull(String folderName);

    // Existence checks
    boolean existsByFolderNameAndParentFolder(String folderName, Folder parentFolder);
    boolean existsByFolderNameAndParentFolderIsNull(String folderName);

    // Search queries
    @Query("SELECT f FROM Folder f WHERE f.folderName LIKE %:name% OR f.description LIKE %:name%")
    List<Folder> searchByNameOrDescription(@Param("name") String name);

    // User-specific queries
    @Query("SELECT f FROM Folder f WHERE f.createdBy = :createdBy ORDER BY f.createdTime DESC")
    List<Folder> findByCreatedByOrderByCreatedTimeDesc(@Param("createdBy") String createdBy);

    // Root folders query
    @Query("SELECT f FROM Folder f WHERE f.isRoot = true")
    List<Folder> findRootFolders();
}