package bpmnProject.akon.bpmnJavaBackend.DtoClasses;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ProfileSettingsDto {
    private String activeTab;
}