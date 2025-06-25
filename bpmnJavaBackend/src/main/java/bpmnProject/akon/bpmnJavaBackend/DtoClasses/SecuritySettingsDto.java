package bpmnProject.akon.bpmnJavaBackend.DtoClasses;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SecuritySettingsDto {
    private Boolean twoFactorAuth;
    private Integer sessionTimeout;
    private Boolean loginNotifications;
}
