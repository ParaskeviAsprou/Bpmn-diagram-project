package bpmnProject.akon.bpmnJavaBackend.DtoClasses;

public class DiagramSettingsDto {
    private Double zoom;
    private String viewBox;
    private String lastModified;
    private String version;

    public DiagramSettingsDto() {}

    public Double getZoom() { return zoom; }
    public void setZoom(Double zoom) { this.zoom = zoom; }

    public String getViewBox() { return viewBox; }
    public void setViewBox(String viewBox) { this.viewBox = viewBox; }

    public String getLastModified() { return lastModified; }
    public void setLastModified(String lastModified) { this.lastModified = lastModified; }

    public String getVersion() { return version; }
    public void setVersion(String version) { this.version = version; }
}

