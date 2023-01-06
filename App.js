import * as Clipboard from "expo-clipboard";
import Constants from "expo-constants";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import { Button, ProgressBar, MD3Colors, Card, Text as PaperText, IconButton } from "react-native-paper"
import AWS from 'aws-sdk';
import { Image, Text, View } from "react-native";
import { styles } from './Styles';
import * as Progress from 'react-native-progress';

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
  const [uploadingFirstPhoto, setUploadingFirstPhoto] = useState(false);
  const [uploadingSecondPhoto, setUploadingSecondPhoto] = useState(false);
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


  const takeFirstPhoto = async () => {
    setUploadingFirstPhoto(true);
    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: "Images",
      aspect: [4, 3],
    });

    await handleImagePicked(result, 1);
  };

  const takeSecondPhoto = async () => {
    setUploadingSecondPhoto(true);
    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: "Images",
      aspect: [4, 3],
    });

    await handleImagePicked(result, 2);
  };


  const pickFirstImage = async (e) => {
    console.log('event', e.event);

    setUploadingFirstPhoto(true);
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "Images",
      quality: 1,
    });

    await handleImagePicked(result, 1);
  };


  const pickSecondImage = async (e) => {

    setUploadingSecondPhoto(true);
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "Images",
      quality: 1,
    });

    await handleImagePicked(result, 2);
  };

  const clearSelection = () => {
    console.log('reaching clearselection')
    count = 0;
    setImage1('');
    setImage2('');
    setFirstImageKey(null);
    setSecondImageKey(null);
    setSimilarity(0);
    setUploadingFirstPhoto(false);
    setUploadingSecondPhoto(false);
    setIsCompareDisabled(true);
  };

  let uploadImageToS3 = async (filename, img, id) => {
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
            setUploaded(uploaded + 1)
            id === 1 ? setUploadingFirstPhoto(false) : setUploadingSecondPhoto(false);
            if (count === 2) {
              setIsCompareDisabled(false);
            }
          })
          .catch(() => {
            clearSelection();
            console.error(`Error upload failed, please try again`);
            id === 1 ? setUploadingFirstPhoto(false) : setUploadingSecondPhoto(false);
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
    } catch (err) {
    }
  };

  let uploadImage = (filename, img, id) => {
    uploadImageToS3(filename, img, id);
  };


  let handleImagePicked = async (pickerResult, id) => {
    try {
      if (pickerResult.cancelled) {
        id === 1 ? setUploadingFirstPhoto(false) : setUploadingSecondPhoto(false);
        return;
      } else {
        const img = await fetchImageFromUri(pickerResult.uri);
        const filename = `demo-${Date.now()}.jpg`;
        if (id === 1) {
          setImage1(pickerResult.uri);
          setFirstImageKey(filename);
          count += 1;
        } else if (id === 2) {
          setImage2(pickerResult.uri);
          setSecondImageKey(filename);
          count += 1;
        }
        uploadImage(filename, img, id);
      }
    } catch (e) {
      alert(`Upload snehith failed ${e}`);
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

  function getWindowDimension(event) {
    device_width = event.nativeEvent.layout.width,
    device_height = event.nativeEvent.layout.height

    console.log (device_height);  // Yeah !! good value
    console.log (device_width);
  }
  return (
      <View style={styles.container} onLayout={(event) => getWindowDimension(event)}>

        <PaperText variant="displayMedium" style={{marginBottom: 40}}>Hello there!</PaperText>
        <PaperText variant="bodyLarge" style={{marginBottom: 10}}>Please upload/take a photo to get started:</PaperText>

        <View style={styles.cardContainer}>
          <View>
            <Image
                style={styles.roundedImage}
                source={image1 ? {uri: image1} : require('./man.jpeg')}
            />
            <View style={{flexDirection: 'row', justifyContent: 'center'}}>
              <IconButton id={'firstCamera'} icon="camera" onPress={takeFirstPhoto} mode="outlined" style={{marginRight: 5}} disabled={uploadingFirstPhoto} />
              <IconButton id={'firstImage'} icon="image" style={{ marginBottom: 10 }} disabled={uploadingFirstPhoto} onPress={pickFirstImage} mode="contained" loading={uploadingFirstPhoto} />
            </View>
          </View>
          <View style={{justifyContent: 'center'}}>
            <Image
                style={styles.roundedImage}
                source={image2 ? {uri: image2} : require('./woman.jpeg')}
            />
            <View style={{flexDirection: 'row', justifyContent: 'center'}}>
              <IconButton icon="camera" onPress={takeSecondPhoto} mode="outlined" style={{marginRight: 5}} disabled={uploadingSecondPhoto}/>
              <IconButton icon="image" style={{ marginBottom: 10 }} disabled={uploadingSecondPhoto} onPress={pickSecondImage} mode="contained" loading={uploadingSecondPhoto}/>
            </View>
          </View>
        </View>

        <View style={{padding: 20}}>
          <View style={{justifyContent: 'center', flexDirection: 'row'}}>
            <Button style={{marginRight: 5}} icon="close-circle" onPress={clearSelection} mode="outlined"> Clear </Button>
            <Button onPress={compareFaces} mode={'outlined'} icon={"compare"} disabled={uploadingFirstPhoto || uploadingSecondPhoto || isCompareDisabled} loading={compareLoading}>Compare!</Button>
          </View>
          <Progress.Bar color={'#424141'} progress={similarity / 100} width={null} height={15} borderRadius={8} style={{marginTop: 50}} />
          <PaperText variant="titleMedium" style={{marginBottom: 5, justifyContent: 'center'}}> {`Match percentage: ${similarity.toFixed(2)}`}</PaperText>
        </View>

      </View>
  );
}