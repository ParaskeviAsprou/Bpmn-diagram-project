package bpmnProject.akon.bpmnJavaBackend.File;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class FolderService {

    private final FolderRepository folderRepository;
    private final FileRepository fileRepository;

    @Autowired
    public FolderService(FolderRepository folderRepository, FileRepository fileRepository) {
        this.folderRepository = folderRepository;
        this.fileRepository = fileRepository;
    }

    /**
     * Create root folder
     */
    @Transactional
    public Folder createRootFolder(String folderName, String description, String createdBy) {
        if (folderRepository.existsByFolderNameAndParentFolderIsNull(folderName)) {
            throw new RuntimeException("Root folder with name '" + folderName + "' already exists");
        }

        Folder rootFolder = new Folder();
        rootFolder.setFolderName(folderName);
        rootFolder.setDescription(description);
        rootFolder.setCreatedBy(createdBy);
        rootFolder.setCreatedTime(LocalDateTime.now());
        rootFolder.setIsRoot(true);
        rootFolder.setParentFolder(null);

        return folderRepository.save(rootFolder);
    }

    /**
     * Create subfolder
     */
    @Transactional
    public Folder createSubFolder(Long parentFolderId, String folderName, String description, String createdBy) {
        Folder parentFolder = folderRepository.findById(parentFolderId)
                .orElseThrow(() -> new RuntimeException("Parent folder not found with id: " + parentFolderId));

        if (folderRepository.existsByFolderNameAndParentFolder(folderName, parentFolder)) {
            throw new RuntimeException("Folder with name '" + folderName + "' already exists in this location");
        }

        Folder subFolder = new Folder();
        subFolder.setFolderName(folderName);
        subFolder.setDescription(description);
        subFolder.setCreatedBy(createdBy);
        subFolder.setCreatedTime(LocalDateTime.now());
        subFolder.setIsRoot(false);
        subFolder.setParentFolder(parentFolder);

        Folder savedFolder = folderRepository.save(subFolder);

        // Update parent folder's updated time
        parentFolder.setUpdatedTime(LocalDateTime.now());
        folderRepository.save(parentFolder);

        return savedFolder;
    }

    /**
     * Get all root folders
     */
    @Transactional(readOnly = true)
    public List<Folder> getRootFolders() {
        return folderRepository.findByParentFolderIsNullOrderByFolderNameAsc();
    }

    /**
     * Get subfolders of a folder
     */
    @Transactional(readOnly = true)
    public List<Folder> getSubFolders(Long folderId) {
        return folderRepository.findByParentFolderIdOrderByFolderNameAsc(folderId);
    }

    /**
     * Get folder by id with statistics
     */
    @Transactional(readOnly = true)
    public Optional<Folder> getFolderWithStats(Long folderId) {
        return folderRepository.findById(folderId);
    }

    /**
     * Move folder to new parent
     */
    @Transactional
    public Folder moveFolder(Long folderId, Long newParentFolderId, String updatedBy) {
        Folder folder = folderRepository.findById(folderId)
                .orElseThrow(() -> new RuntimeException("Folder not found with id: " + folderId));

        Folder newParentFolder = null;
        if (newParentFolderId != null) {
            newParentFolder = folderRepository.findById(newParentFolderId)
                    .orElseThrow(() -> new RuntimeException("New parent folder not found with id: " + newParentFolderId));

            // Check for circular reference
            if (newParentFolder.isSubFolderOf(folder)) {
                throw new RuntimeException("Cannot move folder: would create circular reference");
            }

            // Check if folder with same name exists in new parent
            if (folderRepository.existsByFolderNameAndParentFolder(folder.getFolderName(), newParentFolder)) {
                throw new RuntimeException("Folder with name '" + folder.getFolderName() +
                        "' already exists in destination folder");
            }
        } else {
            // Moving to root
            if (folderRepository.existsByFolderNameAndParentFolderIsNull(folder.getFolderName())) {
                throw new RuntimeException("Root folder with name '" + folder.getFolderName() + "' already exists");
            }
        }

        folder.setParentFolder(newParentFolder);
        folder.setIsRoot(newParentFolder == null);
        folder.setUpdatedTime(LocalDateTime.now());

        return folderRepository.save(folder);
    }

    /**
     * Rename folder
     */
    @Transactional
    public Folder renameFolder(Long folderId, String newName, String updatedBy) {
        Folder folder = folderRepository.findById(folderId)
                .orElseThrow(() -> new RuntimeException("Folder not found with id: " + folderId));

        // Check if folder with new name already exists in same parent
        if (folder.getParentFolder() != null) {
            if (folderRepository.existsByFolderNameAndParentFolder(newName, folder.getParentFolder())) {
                throw new RuntimeException("Folder with name '" + newName + "' already exists in this location");
            }
        } else {
            if (folderRepository.existsByFolderNameAndParentFolderIsNull(newName)) {
                throw new RuntimeException("Root folder with name '" + newName + "' already exists");
            }
        }

        folder.setFolderName(newName);
        folder.setUpdatedTime(LocalDateTime.now());

        return folderRepository.save(folder);
    }

    /**
     * Delete folder (must be empty)
     */
    @Transactional
    public void deleteFolder(Long folderId) {
        Folder folder = folderRepository.findById(folderId)
                .orElseThrow(() -> new RuntimeException("Folder not found with id: " + folderId));

        // Check if folder has files
        List<File> filesInFolder = fileRepository.findByFolderIdOrderByUploadTimeDesc(folderId);
        if (!filesInFolder.isEmpty()) {
            throw new RuntimeException("Cannot delete folder: it contains " + filesInFolder.size() + " files");
        }

        // Check if folder has subfolders
        List<Folder> subFolders = folderRepository.findByParentFolderIdOrderByFolderNameAsc(folderId);
        if (!subFolders.isEmpty()) {
            throw new RuntimeException("Cannot delete folder: it contains " + subFolders.size() + " subfolders");
        }

        folderRepository.delete(folder);
    }

    /**
     * Get folder breadcrumb path
     */
    @Transactional(readOnly = true)
    public List<FolderBreadcrumb> getFolderBreadcrumb(Long folderId) {
        Folder folder = folderRepository.findById(folderId)
                .orElseThrow(() -> new RuntimeException("Folder not found with id: " + folderId));

        List<FolderBreadcrumb> breadcrumbs = new java.util.ArrayList<>();
        Folder current = folder;

        while (current != null) {
            FolderBreadcrumb breadcrumb = new FolderBreadcrumb();
            breadcrumb.setId(current.getId());
            breadcrumb.setName(current.getFolderName());
            breadcrumb.setPath(current.getFolderPath());

            breadcrumbs.add(0, breadcrumb);
            current = current.getParentFolder();
        }

        return breadcrumbs;
    }

    /**
     * Get folder tree structure
     */
    @Transactional(readOnly = true)
    public List<FolderTreeNode> getFolderTree() {
        List<Folder> rootFolders = getRootFolders();
        return rootFolders.stream()
                .map(this::buildFolderTreeNode)
                .toList();
    }

    private FolderTreeNode buildFolderTreeNode(Folder folder) {
        List<Folder> subFolders = folderRepository.findByParentFolderOrderByFolderNameAsc(folder);
        List<FolderTreeNode> children = subFolders.stream()
                .map(this::buildFolderTreeNode)
                .toList();

        FolderTreeNode node = new FolderTreeNode();
        node.setId(folder.getId());
        node.setName(folder.getFolderName());
        node.setPath(folder.getFolderPath());
        node.setFileCount(folder.getFileCount());
        node.setSubFolderCount(folder.getSubFolderCount());
        node.setChildren(children);

        return node;
    }

    /**
     * Move file to folder
     */
    @Transactional
    public File moveFileToFolder(Long fileId, Long folderId) {
        File file = fileRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found with id: " + fileId));

        Folder folder = null;
        if (folderId != null) {
            folder = folderRepository.findById(folderId)
                    .orElseThrow(() -> new RuntimeException("Folder not found with id: " + folderId));
        }

        file.setFolder(folder);
        file.setUpdatedTime(LocalDateTime.now());

        return fileRepository.save(file);
    }

    /**
     * Create folder (generic method)
     */
    @Transactional
    public Folder createFolder(String name, String description, Long parentFolderId) {
        if (parentFolderId != null) {
            return createSubFolder(parentFolderId, name, description, "system");
        } else {
            return createRootFolder(name, description, "system");
        }
    }

    @Transactional(readOnly = true)
    public List<File> getFilesInFolder(Long folderId) {
        if (folderId == null) {
            return fileRepository.findByFolderIsNullOrderByUploadTimeDesc();
        }
        return fileRepository.findByFolderIdOrderByUploadTimeDesc(folderId);
    }

    // =================== RESPONSE CLASSES ===================

    public static class FolderBreadcrumb {
        private Long id;
        private String name;
        private String path;

        public FolderBreadcrumb() {}

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getPath() { return path; }
        public void setPath(String path) { this.path = path; }
    }

    public static class FolderTreeNode {
        private Long id;
        private String name;
        private String path;
        private Integer fileCount;
        private Integer subFolderCount;
        private List<FolderTreeNode> children;

        public FolderTreeNode() {}

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getPath() { return path; }
        public void setPath(String path) { this.path = path; }

        public Integer getFileCount() { return fileCount; }
        public void setFileCount(Integer fileCount) { this.fileCount = fileCount; }

        public Integer getSubFolderCount() { return subFolderCount; }
        public void setSubFolderCount(Integer subFolderCount) { this.subFolderCount = subFolderCount; }

        public List<FolderTreeNode> getChildren() { return children; }
        public void setChildren(List<FolderTreeNode> children) { this.children = children; }
    }
}