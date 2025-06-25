package bpmnProject.akon.bpmnJavaBackend.DtoClasses;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PreferencesDto {
    private String theme;
    private String language;
    private String timezone;
    private String dateFormat;
    private NotificationsDto notifications;
}