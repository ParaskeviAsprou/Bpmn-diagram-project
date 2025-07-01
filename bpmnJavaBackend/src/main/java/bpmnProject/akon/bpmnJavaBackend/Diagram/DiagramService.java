package bpmnProject.akon.bpmnJavaBackend.Diagram;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.transaction.Transactional;
import org.camunda.bpm.model.bpmn.instance.di.Diagram;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.stream.Collectors;

@Service
@Transactional
public class DiagramService {
    @Autowired
    private DiagramRepository repository;

    @Autowired
    private ObjectMapper objectMapper;

    public DiagramDto saveDiagram(DiagramDto dto) {
        Diagram entity = convertToEntity(dto);
        entity.setCreatedBy(getCurrentUsername());
        Diagram saved = repository.save(entity);
        return convertToDto(saved);
    }

    public Optional<DiagramDto> getDiagramById(Long id) {
        return repository.findById(id)
                .map(this::convertToDto);
    }

    public List<DiagramDto> getAllDiagramsForCurrentUser() {
        String currentUser = getCurrentUsername();
        return repository.findByCreatedByOrderByUpdatedAtDesc(currentUser)
                .stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }
}
