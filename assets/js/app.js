'use strict';

const albumBucketName = 'origo-uploaded';
const bucketRegion = 'us-east-1';
const IdentityPoolId = 'us-east-1:xxxxxxx';

AWS.config.update({
    region: bucketRegion,
    credentials: new AWS.CognitoIdentityCredentials({
        IdentityPoolId: IdentityPoolId
    })
});

const s3 = new AWS.S3({
    apiVersion: '2006-03-01',
    params: { Bucket: albumBucketName }
});

let dynamodb = new AWS.DynamoDB();
let docClient = new AWS.DynamoDB.DocumentClient();

function classifyImage() {
    var files = document.getElementById('imageToClassify').files;

    if (!files.length) {
        return alert('Please choose a file to upload first.');
    }

    let file = files[0];

    console.log("You selected ", file.name);

    document.getElementById('load-img').style.visibility = "visible";

    let i;
    for (i = 0; i < files.length; i++) {
        let file = files[i];
        let fileName = file.name;

        s3.upload({
            Key: fileName,
            Body: file,
            ACL: 'public-read'
        }, (err, data) => {
            if (err) {
                return alert('There was an error uploading your image: ', err.stack);
                document.getElementById('load-img').style.visibility = "hidden";
            }
            document.getElementById('result').innerHTML = "";            
            document.getElementById('feedback-yes').style.visibility = "hidden";
            document.getElementById('feedback-no').style.visibility = "hidden";
            document.getElementById('feedback-text').style.visibility = "hidden";
            document.getElementById('result').innerHTML = "Successfully uploaded image: " + fileName;
            classify(fileName);
        });
    }
}

function classify(name) {
    let xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://bvcoblioxe.execute-api.us-east-1.amazonaws.com/dev/classify?imagename=' + name, true);
    xhr.setRequestHeader("x-api-key", "xxxxx");
    xhr.send();

    xhr.onreadystatechange = () => {
        let label = "";
        let probability_percentage = "";
        if (xhr.readyState == XMLHttpRequest.DONE) {
            // alert(xhr.responseText);
            const response = JSON.parse(xhr.responseText);
            console.log(response);
            if (xhr.status == 200) {
                try {
                    label = response.best_label.label_name;
                    probability_percentage = response.best_label.probability_percentage;
                }
                catch (err) {
                    document.getElementById('result').innerHTML += 'Error classifing image: ' + name + '. Try another one.';
                    console.log(err.message);
                    return;
                }
            }
            //document.getElementById('result').innerHTML += label + ' - probability: ' + probability_percentage;
            document.getElementById('label').innerHTML = label;
            document.getElementById('probability').innerHTML = probability_percentage;
            document.getElementById('feedback-text').style.visibility = "visible";  

            document.getElementById('feedback-yes').style.visibility = "visible";
            document.getElementById("feedback-yes").addEventListener("click", function() {
                pollImage(name, probability_percentage, label, 1);
            });
            //document.getElementById('btn-right').onclick(pollImage(name, probability_percentage, label, 1));

            document.getElementById('feedback-no').style.visibility = "visible";
            document.getElementById("feedback-no").addEventListener("click", function() {
                pollImage(name, probability_percentage, label, 0);
            });
            document.getElementById('load-img').style.visibility = "hidden";
        }
    };
}

function pollImage(filename, probability_percentage, label, feedback) {
    const params = {
        TableName: "imageClassification",
        Item: {
            "id": Math.random().toString(36).slice(2),
            "image": filename,
            "probability_percentage": probability_percentage,
            "label": label,
            "feedback": feedback,
            "timestamp" : Date.now()
        }
    };
    docClient.put(params, (err, data) => {
        if (err) {
            console.log("Unable to add item: " + "\n" + JSON.stringify(err, undefined, 2));
        } else {
            document.getElementById('feedback-text').style.visibility = "hidden";
            document.getElementById('feedback-yes').style.visibility = "hidden";
            document.getElementById('feedback-no').style.visibility = "hidden";
            document.getElementById('result').innerHTML += "<p class='text-success'>Thank you!!</p>";
            console.log(JSON.stringify(data, undefined, 2));
        }
    });

}

function render() {
    let file = document.getElementById('imageToClassify').files[0];

    document.getElementById('result').innerHTML = "Select <kbd>Classify image</kbd> button to start.";

    let reader = new FileReader();
    // it's onload event and you forgot (parameters)
    reader.onload = function (e) {
        var image = document.getElementById("selectedImg");
        // the result image data
        image.src = e.target.result;
        //document.body.appendChild(image);
    }
    // you have to declare the file loading
    reader.readAsDataURL(file);
}