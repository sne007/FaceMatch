import {StyleSheet} from "react-native";

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        backgroundColor: "#fcfae1",
        paddingLeft: 20,
        paddingRight: 20,
        PaddingBottom: 20
    },
    cardContainer: {
        justifyContent: 'space-between',
        alignItems: 'center',
        flexDirection: 'row',
        padding: 20,
        paddingBottom: 5,
        marginBottom: 10,
        // backgroundColor: '#eee',
        // shadowColor: '#171717',
        // shadowOffset: {width: -2, height: 4},
        // shadowOpacity: 0.2,
        // shadowRadius: 3,
    },
    roundedImage: {
        width: 130,
        height: 130,
        borderRadius: 75,
        borderWidth: 3,
        borderColor: 'black'
    },
    top: {
        flex: 0.3,
        backgroundColor: "grey",
        borderWidth: 5,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    middle: {
        flex: 0.3,
        backgroundColor: "beige",
        borderWidth: 5,
    },
    bottom: {
        flex: 0.3,
        backgroundColor: "pink",
        borderWidth: 5,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
    },
    top1: {
        flex: 0.5,
        backgroundColor: "grey",
        borderWidth: 5,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    top2: {
        flex: 0.5,
        backgroundColor: "grey",
        borderWidth: 5,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    title: {
        fontSize: 20,
        marginBottom: 20,
        textAlign: "center",
        marginHorizontal: 15,
    },
    percentage: {
        marginBottom: 10,
    },
    result: {
        paddingTop: 5,
    },
    info: {
        textAlign: "center",
        marginBottom: 20,
    },
});
