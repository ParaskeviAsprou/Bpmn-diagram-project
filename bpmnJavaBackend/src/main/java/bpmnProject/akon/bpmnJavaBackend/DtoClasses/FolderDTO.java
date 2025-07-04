package bpmnProject.akon.bpmnJavaBackend.DtoClasses;

import java.time.LocalDateTime;

public class FolderDTO {
    private Long id;
    private String folderName;
    private String description;
    private String createdBy;
    private Boolean isRoot;
    private Long parentFolderId;
    private String folderPath;
    private LocalDateTime createdTime;
    private LocalDateTime updatedTime;


    private Integer fileCount;
    private Integer subFolderCount;
    private Long totalSize;

    // Constructors
    public FolderDTO() {}

    public FolderDTO(Long id, String folderName, String description, String createdBy,
                     Boolean isRoot, Long parentFolderId, String folderPath,
                     LocalDateTime createdTime, LocalDateTime updatedTime,
                     Integer fileCount, Integer subFolderCount, Long totalSize) {
        this.id = id;
        this.folderName = folderName;
        this.description = description;
        this.createdBy = createdBy;
        this.isRoot = isRoot;
        this.parentFolderId = parentFolderId;
        this.folderPath = folderPath;
        this.createdTime = createdTime;
        this.updatedTime = updatedTime;
        this.fileCount = fileCount;
        this.subFolderCount = subFolderCount;
        this.totalSize = totalSize;
    }

    // Getters & Setters

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getFolderName() {
        return folderName;
    }

    public void setFolderName(String folderName) {
        this.folderName = folderName;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }

    public Boolean getIsRoot() {
        return isRoot;
    }

    public void setIsRoot(Boolean isRoot) {
        this.isRoot = isRoot;
    }

    public Long getParentFolderId() {
        return parentFolderId;
    }

    public void setParentFolderId(Long parentFolderId) {
        this.parentFolderId = parentFolderId;
    }

    public String getFolderPath() {
        return folderPath;
    }

    public void setFolderPath(String folderPath) {
        this.folderPath = folderPath;
    }

    public LocalDateTime getCreatedTime() {
        return createdTime;
    }

    public void setCreatedTime(LocalDateTime createdTime) {
        this.createdTime = createdTime;
    }

    public LocalDateTime getUpdatedTime() {
        return updatedTime;
    }

    public void setUpdatedTime(LocalDateTime updatedTime) {
        this.updatedTime = updatedTime;
    }

    public Integer getFileCount() {
        return fileCount;
    }

    public void setFileCount(Integer fileCount) {
        this.fileCount = fileCount;
    }

    public Integer getSubFolderCount() {
        return subFolderCount;
    }

    public void setSubFolderCount(Integer subFolderCount) {
        this.subFolderCount = subFolderCount;
    }

    public Long getTotalSize() {
        return totalSize;
    }

    public void setTotalSize(Long totalSize) {
        this.totalSize = totalSize;
    }
}
