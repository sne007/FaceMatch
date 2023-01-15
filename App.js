import Constants from "expo-constants";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import { Button, Text as PaperText, IconButton } from "react-native-paper"
import AWS from 'aws-sdk';
import { Image, View, ToastAndroid, ImageBackground, Animated, Easing, StatusBar } from "react-native";
import { styles } from './Styles';
import * as Progress from 'react-native-progress';
import ConfettiCannon from 'react-native-confetti-cannon';
import { captureScreen } from "react-native-view-shot";
import * as MediaLibrary from 'expo-media-library';
import { BannerAd, BannerAdSize, AdEventType, RewardedInterstitialAd, RewardedAdEventType, TestIds } from 'react-native-google-mobile-ads';

let count = 0;
let clickCount = 1;
const bucketName = 'face-compare-007';
AWS.config.update(
    {
      region: 'us-east-1',
      credentials: {
        accessKeyId: 'AKIAW53M3PFP6BAAVZUO',
        secretAccessKey: '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'
      }
    });

const rewardedInterstitial = RewardedInterstitialAd.createForAdRequest('ca-app-pub-4840548447055113/5525209712');

export default function App() {
  const s3 = new AWS.S3({apiVersion: '2006-03-01'});
  const rekognition = new AWS.Rekognition({apiVersion: '2016-06-27'});

  const [image1, setImage1] = useState('');
  const [image2, setImage2] = useState('');
  const [firstImageKey, setFirstImageKey] = useState(null);
  const [secondImageKey, setSecondImageKey] = useState(null);
  const [similarity, setSimilarity] = useState(0);
  const [uploadingFirstPhoto, setUploadingFirstPhoto] = useState(false);
  const [uploadingSecondPhoto, setUploadingSecondPhoto] = useState(false);
  const [uploaded, setUploaded] = useState(0);
  const [isCompareDisabled, setIsCompareDisabled] = useState(true);
  const [compareLoading, setCompareLoading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [rewardedInterstitialLoaded, setRewardedInterstitialLoaded] = useState(false);

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

  useEffect(() => {
    const unsubscribeLoaded = rewardedInterstitial.addAdEventListener(
        RewardedAdEventType.LOADED,
        () => {
          setRewardedInterstitialLoaded(true);
        },
    );
    const unsubscribeEarned = rewardedInterstitial.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        reward => {
          console.log('User earned reward of 2 free compares', reward);
        },
    );

    const unsubscribeClosed = rewardedInterstitial.addAdEventListener(
        AdEventType.CLOSED,
        () => {
          setRewardedInterstitialLoaded(false);
          rewardedInterstitial.load();
        }
    );

    // Start loading the rewarded interstitial ad straight away
    rewardedInterstitial.load();

    // Unsubscribe from events on unmount
    return () => {
      unsubscribeLoaded();
      unsubscribeEarned();
      unsubscribeClosed();
    };
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
    count = 0;
    setImage1('');
    setImage2('');
    setFirstImageKey(null);
    setSecondImageKey(null);
    setSimilarity(0);
    setUploadingFirstPhoto(false);
    setUploadingSecondPhoto(false);
    setIsCompareDisabled(true)
    setCompareLoading(false);
    setShowConfetti(false);
  };

  const takeScreenshot = async () => {
    const val =  await MediaLibrary.getPermissionsAsync();
    if (!val.canAskAgain && !val.granted) {
      ToastAndroid.show('App doesn\'t have permissions to save!', ToastAndroid.SHORT);
      return;
    } else if (val.canAskAgain && !val.granted) {
      const permissionResult = await MediaLibrary.requestPermissionsAsync();
      if (!permissionResult.granted) {
        return;
      }
    }

    captureScreen({
      format: "jpg",
      quality: 0.8
    })
        .then(
            uri => {
              MediaLibrary.createAssetAsync(uri);
              ToastAndroid.show('Screenshot saved to photos!', ToastAndroid.SHORT);
            },
            error => console.error("Oops, snapshot failed", error)
        )
        .catch((e) => {
          ToastAndroid.show('Failed to capture screen!', ToastAndroid.SHORT);
        })
  }


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
    } catch (err) {
      console.log(`Error: ${err}`);
    }
  };

  const compareFaces = async () => {
    if (clickCount > 2 && rewardedInterstitialLoaded) {
      rewardedInterstitial.show();
    }
    clickCount += 1;
    setCompareLoading(true);
    if (!firstImageKey || !secondImageKey) {
      setCompareLoading(false);
      alert('Please upload 2 images to continue');
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
            if (value.FaceMatches.length > 0) {
              setShowConfetti(true)
              let res = value.FaceMatches[0].Similarity;
              if (res >= 1 && res < 15) {
                setSimilarity(res + 15);
              } else if (res >= 15 && res < 55) {
                setSimilarity(res + 10)
              } else {
                setSimilarity(res);
              }
            } else {
              setSimilarity(0.01);
            }
          })
          .catch((e) => {
            setCompareLoading(false);
            setShowConfetti(false);
            setSimilarity(0);
          });
    } catch (err) {
      clearSelection();
    }
  };

  let uploadImage = (filename, img, id) => {
    uploadImageToS3(filename, img, id);
  };


  let handleImagePicked = async (pickerResult, id) => {
    try {
      if (pickerResult.canceled) {
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

  const fetchImageFromUri = async (uri) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    return blob;
  };

  const analyzing = uploadingFirstPhoto || uploadingSecondPhoto || compareLoading;
  return (
      <ImageBackground style={{flex: 1}} source={require('./stylishBackground1.jpg')}>
        <StatusBar
            animated={true}
            backgroundColor="#cacaca"
            barStyle={'default'}
            showHideTransition={'none'}
            hidden={false} />
        <View style={styles.container}>
          <PaperText variant="displayMedium" style={{marginBottom: 40}}>Welcome! 😄</PaperText>
          <PaperText variant="bodyLarge" style={{marginBottom: 10}}>Please upload/capture photos to compare faces:</PaperText>

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
              <Button style={{marginRight: 15}} icon="close-circle" onPress={clearSelection} mode="outlined"> Clear </Button>
              <Button onPress={compareFaces} mode={'contained'} color={'#6081f7'} icon={"compare"} disabled={analyzing || isCompareDisabled} loading={analyzing}>
                {compareLoading ? 'Analyzing Image(s)' : (analyzing ? 'Scanning Image(s)' : 'Compare!')}
              </Button>
            </View>
            <Progress.Bar  animationConfig={{ duration: 2000 }} animationType={'timing'} color={'#6081f7'} progress={similarity / 100} width={null} height={15} borderRadius={8} style={{marginTop: 50}} />
            <PaperText variant="titleMedium" style={{marginBottom: 5, justifyContent: 'center'}}> {`Match percentage: ${similarity.toFixed(2)}`}</PaperText>
            <Button style={{marginTop: 25}} onPress={takeScreenshot} mode={'outlined'} icon={"download"}> Take Screenshot </Button>
          </View>
          {showConfetti ?
              <ConfettiCannon
                  count={200}
                  origin={{x: -10, y: 0}}
              />
              : null
          }
          <BannerAd unitId={'ca-app-pub-4840548447055113/5214465949'} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
          <BannerAd unitId={'ca-app-pub-4840548447055113/4205841884'} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
        </View>
      </ImageBackground>
  );
}
