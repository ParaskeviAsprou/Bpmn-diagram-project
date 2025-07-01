package bpmnProject.akon.bpmnJavaBackend.DtoClasses;

import java.util.List;

public class CustomPropertyDto {
    private String id;
    private String title;
    private String type;
    private Object value;
    private boolean required;
    private String description;
    private List<String> options;

    public CustomPropertyDto() {}

    // Getters and setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public Object getValue() { return value; }
    public void setValue(Object value) { this.value = value; }

    public boolean isRequired() { return required; }
    public void setRequired(boolean required) { this.required = required; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public List<String> getOptions() { return options; }
    public void setOptions(List<String> options) { this.options = options; }
}
