package bpmnProject.akon.bpmnJavaBackend.DtoClasses;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserSettingsDto {
    private UserDto profile;
    private PreferencesDto preferences;
    private SecuritySettingsDto security;
    private SettingsDto settings;
}