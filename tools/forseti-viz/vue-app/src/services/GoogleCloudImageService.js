class GoogleCloudImageService {
    getImageUrl(resourceType) {
        // var URL_BASE =
        //     "https://storage.googleapis.com/mps-storage/mzinni/external/gcp-arch-viz-images/";

        var URL_BASE =
        "https://storage.googleapis.com/forseti-viz-icons/public/";
        var imageFilename = "project_logo.png";

        switch (resourceType) {
            case "organization":
                imageFilename = "cloud_logo.png";
                break;

            case "folder":
                imageFilename = "folder_logo.png";
                break;

            case "project":
                imageFilename = "project_logo.png";
                break;

            case "appengine_app":
                imageFilename = "App Engine.png";
                break;

            case "kubernetes_cluster":
                imageFilename = "Container Engine.png";
                break;

            case "instance":
                imageFilename = "Compute Engine.png";
                break;


            case "cloudsqlinstance":
                imageFilename = "Cloud SQL.png";
                break;

            case "bucket":
                imageFilename = "Cloud Storage.png";
                break;

            default:
                imageFilename = "project_logo.png";
                break;
        }

        return URL_BASE + imageFilename;
    }
}

export default new GoogleCloudImageService();