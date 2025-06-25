package bpmnProject.akon.bpmnJavaBackend.DtoClasses;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ChangePasswordDto {
    private String currentPassword;
    private String newPassword;
    private String confirmPassword;
}