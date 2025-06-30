package bpmnProject.akon.bpmnJavaBackend.File;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ElementAttachmentRepository extends JpaRepository<ElementAttachment, Long> {

    List<ElementAttachment> findByParentFileId(Long parentFileId);

    List<ElementAttachment> findByParentFileIdAndElementId(Long parentFileId, String elementId);

    List<ElementAttachment> findByElementIdOrderByCreatedTimeDesc(String elementId);

    List<ElementAttachment> findByElementTypeOrderByCreatedTimeDesc(String elementType);

    @Query("SELECT ea FROM ElementAttachment ea WHERE ea.parentFile.id = :fileId AND ea.elementId = :elementId ORDER BY ea.createdTime DESC")
    List<ElementAttachment> findAttachmentsForElement(@Param("fileId") Long fileId, @Param("elementId") String elementId);

    @Query("SELECT ea FROM ElementAttachment ea WHERE ea.attachmentName LIKE %:name% OR ea.originalFilename LIKE %:name%")
    List<ElementAttachment> searchByName(@Param("name") String name);

    @Query("SELECT ea FROM ElementAttachment ea WHERE ea.category = :category")
    List<ElementAttachment> findByCategory(@Param("category") ElementAttachment.AttachmentCategory category);

    @Query("SELECT COUNT(ea) FROM ElementAttachment ea WHERE ea.parentFile.id = :fileId")
    Long countByParentFileId(@Param("fileId") Long fileId);

    @Query("SELECT COUNT(ea) FROM ElementAttachment ea WHERE ea.parentFile.id = :fileId AND ea.elementId = :elementId")
    Long countByParentFileIdAndElementId(@Param("fileId") Long fileId, @Param("elementId") String elementId);

    void deleteByParentFileId(Long parentFileId);

    void deleteByParentFileIdAndElementId(Long parentFileId, String elementId);
}
