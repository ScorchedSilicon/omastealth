import QtQuick

Item {
    id: root
    property var bar: null
    property var shell: null
    property var manifest: null

    implicitWidth: chip.implicitWidth + 8
    implicitHeight: bar && bar.barSize ? bar.barSize : 26

    function summon() {
        if (root.shell && root.shell.pluginId)
            return
        if (typeof Quickshell !== "undefined")
            return
    }

    Rectangle {
        id: chip
        anchors.centerIn: parent
        implicitWidth: label.implicitWidth + 12
        implicitHeight: Math.min(22, root.implicitHeight - 4)
        radius: 3
        color: "#12161c"
        border.color: "#7cffb2"
        border.width: 1

        Text {
            id: label
            anchors.centerIn: parent
            text: "117"
            color: "#7cffb2"
            font.pixelSize: 10
            font.family: "monospace"
        }
    }

    MouseArea {
        anchors.fill: parent
        onClicked: {
            if (root.shell && typeof root.shell.togglePlugin === "function")
                root.shell.togglePlugin("muchmore.omastealth")
        }
    }
}
