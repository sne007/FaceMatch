import * as Clipboard from "expo-clipboard";
import Constants from "expo-constants";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import { Button, ProgressBar, MD3Colors } from "react-native-paper"
import AWS from 'aws-sdk';
import { Image, Text, View } from "react-native";
import { styles } from './Styles';

let count = 0;
const bucketName = 'face-match-007';
AWS.config.update(
    {
      region: 'us-east-1',
      credentials: {
        accessKeyId: 'AKIASGSB43S6YBTL42HK',
        secretAccessKey: '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'
      }
    });

export default function App() {
  const s3 = new AWS.S3({apiVersion: '2006-03-01'});
  const rekognition = new AWS.Rekognition({apiVersion: '2016-06-27'});

  const [image, setImage] = useState(null);
  const [image1, setImage1] = useState('');
  const [image2, setImage2] = useState('');
  const [firstImageKey, setFirstImageKey] = useState(null);
  const [secondImageKey, setSecondImageKey] = useState(null);
  const [similarity, setSimilarity] = useState(0);
  const [percentage, setPercentage] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(0);
  const [isCompareDisabled, setIsCompareDisabled] = useState(true);
  const [compareLoading, setCompareLoading] = useState(false);

  useEffect(() => {
    (async () => {
      if (Constants.platform.ios) {
        const cameraRollStatus =
            await ImagePicker.requestMediaLibraryPermissionsAsync();
        const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
        if (
            cameraRollStatus.status !== "granted" ||
            cameraStatus.status !== "granted"
        ) {
          alert("Sorry, we need these permissions to make this work!");
        }
      }
    })();
  }, []);

  const takePhoto = async () => {
    setUploading(true);
    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: "Images",
      aspect: [4, 3],
    });

    await handleImagePicked(result);
  };

  const pickImage = async () => {
    setUploading(true);
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "Images",
      quality: 1,
    });

    await handleImagePicked(result);
  };

  const clearSelection = () => {
    console.log('reaching clearselection')
    count = 0;
    setImage1('');
    setImage2('');
    setFirstImageKey(null);
    setSecondImageKey(null);
    setSimilarity(0);
    setUploading(false);
    setIsCompareDisabled(true);
  };

  let uploadImageToS3 = async (filename, img) => {
    // Set the parameters for the upload
    const uploadParams = {
      Bucket: bucketName,
      Key: `${filename}`,
      Body: img,
    };

    try {
      // Upload the file to S3
      await s3.upload(uploadParams).promise()
          .then(() => {
            console.log('wooooow');
            setUploaded(uploaded + 1)
            setUploading(false);
            if (count === 1) {
              setIsCompareDisabled(false);
            }
          })
          .catch(() => {
            clearSelection();
            console.error(`Error upload failed, please try again`);
            setUploading(false);
          });
      console.log(`Uploaded in:`);
    } catch (err) {
      console.log(`Error: ${err}`);
    }
  };


  const compareFaces = async () => {
    setCompareLoading(true);
    if (!firstImageKey || !secondImageKey) {
      alert('Image not found');
      return;
    }

    // Set parameters for compareFaces request
    let params = {
      SimilarityThreshold: 0,
      SourceImage: {
        S3Object: {
          Bucket: bucketName,
          Name: firstImageKey,
        },
      },
      TargetImage: {
        S3Object: {
          Bucket: bucketName,
          Name: secondImageKey,
        },
      },
    };

    // Call compareFaces API
    try {
      const data = await rekognition.compareFaces(params).promise()
          .then((value) => {
            setCompareLoading(false);
            console.log('face matches ', value.FaceMatches);
            if (value.FaceMatches.length > 0) {
              console.log('snehith1');
              const similarity = value.FaceMatches[0].Similarity;
              setSimilarity(similarity);
            } else {
              setSimilarity(0);
            }
          })
          .catch(() => {
            setCompareLoading(false);
            console.log(err, err.stack);
          });
      console.log('snehith', data);
    } catch (err) {
    }
  };

  let uploadImage = (filename, img) => {
    uploadImageToS3(filename, img);
  };


  let handleImagePicked = async (pickerResult) => {
    try {
      if (pickerResult.cancelled) {
        setUploading(false);
        return;
      } else {
        setPercentage(0);
        const img = await fetchImageFromUri(pickerResult.uri);
        const filename = `demo-${Date.now()}.jpg`;
        console.log('reaching1');
        if (count === 0) {
          console.log('reaching2');
          count += 1;
          setImage1(pickerResult.uri);
          setFirstImageKey(filename);
        } else if (count === 1) {
          count = 0;
          setImage2(pickerResult.uri);
          setSecondImageKey(filename);
        }
        uploadImage(filename, img);
        // this.downloadImage(uploadUrl);
      }
    } catch (e) {
      alert("Upload failed");
    }
  };

  const setLoading = (progress) => {
    const calculated = parseInt((progress.loaded / progress.total) * 100);
    updatePercentage(calculated); // due to s3 put function scoped
  };

  const updatePercentage = (number) => {
    setPercentage(number);
  };

  const fetchImageFromUri = async (uri) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    return blob;
  };

  const copyToClipboard = () => {
    Clipboard.setString(image);
    alert("Copied image URL to clipboard");
  };

  return (
      <View style={styles.container}>
        <Text style={styles.title}>Face Match!</Text>
        {percentage !== 0 && <Text style={styles.percentage}>{percentage}%</Text>}

        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Image source={{uri: image1}} style={{width: 100, height: 100, borderRadius: 100 / 2}}/>
          <Image source={{uri: image2}} style={{width: 100, height: 100, borderRadius: 100}}/>
        </View>
        <View>
          <Text variant="displayLarge" style={{marginBottom: 10}}> {`Match percentage: ${similarity}`}</Text>
          <ProgressBar progress={similarity / 100} color={MD3Colors.error50} />
          <Button style={{ marginTop: 10 }} onPress={compareFaces} mode={'outlined'} disabled={uploading || isCompareDisabled} loading={compareLoading}>Compare!</Button>
        </View>
        <View>
          <Button icon="image" style={{ marginBottom: 10 }} disabled={uploading} onPress={pickImage} mode="contained" loading={uploading}> Pick your first image from camera roll </Button>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Button icon="camera" onPress={takePhoto} mode="outlined" style={{marginRight: 5}} disabled={uploading}> Take a photo </Button>
            <Button icon="close-circle" onPress={clearSelection} mode="outlined"> Clear selection </Button>
          </View>
        </View>

      </View>
  );
}