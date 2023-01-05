import {StyleSheet} from "react-native";

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "space-between",
        marginTop: 10,
        marginLeft: 10,
        marginBottom: 10,
        backgroundColor: "#fff",
        padding: 20,
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
