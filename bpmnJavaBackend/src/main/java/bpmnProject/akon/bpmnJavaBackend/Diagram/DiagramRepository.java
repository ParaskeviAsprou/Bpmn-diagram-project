package bpmnProject.akon.bpmnJavaBackend.Diagram;

import org.camunda.bpm.model.bpmn.instance.di.Diagram;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DiagramRepository extends JpaRepository<Diagram, Long> {
    List<Diagram> findByCreatedByOrderByUpdatedAtDesc(String createdBy);
    List<Diagram> findByFileNameContainingIgnoreCase(String fileName);
    List<Diagram> findByTagsContaining(String tag);
}