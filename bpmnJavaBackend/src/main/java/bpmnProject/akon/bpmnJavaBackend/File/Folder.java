package bpmnProject.akon.bpmnJavaBackend.File;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "folders")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(exclude = {"files", "parentFolder", "subFolders"})
@ToString(exclude = {"files", "parentFolder", "subFolders"})
public class Folder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "folder_name", nullable = false)
    private String folderName;

    @Column(name = "description", length = 1000)
    private String description;

    @Column(name = "created_time", nullable = false)
    private LocalDateTime createdTime;

    @Column(name = "updated_time")
    private LocalDateTime updatedTime;

    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "folder_path", length = 2000)
    private String folderPath;

    @Column(name = "is_root", nullable = false)
    @Builder.Default
    private Boolean isRoot = false;

    // Self-referencing relationship for folder hierarchy
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_folder_id")
    @JsonIgnore
    private Folder parentFolder;

    @OneToMany(mappedBy = "parentFolder", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Folder> subFolders = new ArrayList<>();

    // Files in this folder
    @OneToMany(mappedBy = "folder", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<File> files = new ArrayList<>();

    // Computed fields
    @Transient
    private Integer fileCount;

    @Transient
    private Integer subFolderCount;

    @Transient
    private Long totalSize;

    // Helper methods
    public void addFile(File file) {
        files.add(file);
        file.setFolder(this);
    }

    public void removeFile(File file) {
        files.remove(file);
        file.setFolder(null);
    }

    public void addSubFolder(Folder subFolder) {
        subFolders.add(subFolder);
        subFolder.setParentFolder(this);
        subFolder.setFolderPath(buildFolderPath());
    }

    public void removeSubFolder(Folder subFolder) {
        subFolders.remove(subFolder);
        subFolder.setParentFolder(null);
    }

    public String buildFolderPath() {
        if (parentFolder == null || isRoot) {
            return "/" + folderName;
        }
        return parentFolder.buildFolderPath() + "/" + folderName;
    }

    public Integer getFileCount() {
        return files != null ? files.size() : 0;
    }

    public Integer getSubFolderCount() {
        return subFolders != null ? subFolders.size() : 0;
    }

    public Long getTotalSize() {
        if (files == null) return 0L;
        return files.stream()
                .mapToLong(file -> file.getFileSize() != null ? file.getFileSize() : 0L)
                .sum();
    }

    public boolean isSubFolderOf(Folder potentialParent) {
        Folder current = this.parentFolder;
        while (current != null) {
            if (current.equals(potentialParent)) {
                return true;
            }
            current = current.getParentFolder();
        }
        return false;
    }

    @PrePersist
    public void prePersist() {
        if (createdTime == null) {
            createdTime = LocalDateTime.now();
        }
        updatedTime = LocalDateTime.now();
        folderPath = buildFolderPath();
    }

    @PreUpdate
    public void preUpdate() {
        updatedTime = LocalDateTime.now();
        folderPath = buildFolderPath();
    }
}