# DSA_MINIPROJECT
Mine sweeper game using 2-D Array

https://sites.google.com/vvce.ac.in/devop?pli=1&authuser=2

package JavaApplication.JavaApplication;

import java.io.FileReader;
import java.io.IOException;

import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;
import org.json.simple.parser.ParseException;

public class ReadJSON {

	public static void main(String[] args) throws IOException, ParseException {
		// TODO Auto-generated method stub
		JSONParser jsonparser = new JSONParser();
	       FileReader reader = new FileReader(".\\JSON\\student.json");
	       
	       Object obj = jsonparser.parse(reader);
	        JSONObject studentobj = (JSONObject)obj;
	        String fname = (String)studentobj.get("firstname");
	        String lname = (String)studentobj.get("lastname");
	        
	        System.out.println("Firstname:"+fname);
	        System.out.println("Lastname:"+lname);
	}

}




FROM httpd:latest
COPY index.html /usr/local/apache2/htdocs/

docker build -t __imgname__ . 
docker run -d --name  __cntname__ -p 9090:80 __ingname__ 
docker tag __imgid__ vvce0122/__imgname__
docker push vvce0122/__ingname__
docker pull vvce0122/__imgname__

KUB
docker build -t __imgname__ . 
docker run -d --name  __cntname__ -p 9090:80 __ingname__ 
kubectl version
kubectl apply  -f deployment.yml
kubectl get deployments
kubectl get pods
kubectl apply -f service.yml
kubectl scale deployment  __img__ --replicas=5
kubectl delete pod __podid___
kubectl get endpoints ig2


