package bpmnProject.akon.bpmnJavaBackend.DtoClasses;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class NotificationsDto {
    private Boolean email;
    private Boolean inApp;
    private Boolean push;
}
