export interface AppFile {
    id?: number;
    fileName?: string;
    fileType?: string;
    fileSize?: number;
    uploadTime?: string;
    content?: string;
    shortLink?: string;
    base64Data?: string;
    newFile?:string;
}