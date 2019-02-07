# GKE README

- [https://cloud.google.com/kubernetes-engine/docs/tutorials/hello-app)(Tutorial: Hello-App Kubernetes)

## Notes

- Make sure to enable "Legacy Authorization" on GCP Kubernetes Cluster >> Edit

## Kubernetes Deployment URL

- [https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.11/#create-21]

## Generate .yaml file from Kubernetes deployment

- https://blog.heptio.com/using-kubectl-to-jumpstart-a-yaml-file-heptioprotip-6f5b8a63a3ea
- kubectl get deployment nodedocker-web -o yaml --export > myapp.yaml

## Kubernetes Resources

- http://kubernetesbyexample.com/deployments/
- https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- https://www.mirantis.com/blog/introduction-to-yaml-creating-a-kubernetes-deployment/
- https://github.com/kubernetes/charts/tree/master/stable/

## Delete Pod in Cluster

- $ gcloud container clusters get-credentials k8s-spinnaker --zone us-central1-a --project pso-jretelny-demo1-spinnaker  && kubectl delete deployment rss-site-v000 --namespace spinnaker