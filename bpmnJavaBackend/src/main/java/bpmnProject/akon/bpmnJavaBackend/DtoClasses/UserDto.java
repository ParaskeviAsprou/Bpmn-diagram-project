package bpmnProject.akon.bpmnJavaBackend.DtoClasses;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDto {
    private Integer id;
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private String address;
    private String username;
    private String password;
    private String profilePicture;
    private Set<RoleDto> roles;
}