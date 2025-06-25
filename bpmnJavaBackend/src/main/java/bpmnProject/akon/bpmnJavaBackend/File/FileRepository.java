package bpmnProject.akon.bpmnJavaBackend.File;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface FileRepository extends JpaRepository<File,Long> {
    Optional<File> findByFileName(String fileName);
    void deleteByFileName(String fileName);
}