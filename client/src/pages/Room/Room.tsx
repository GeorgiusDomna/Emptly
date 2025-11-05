import { messageList } from "@/dataBase/massegeList";
import { DialogInput } from "@/components/DialogInput/DialogInput";
import { MessageItem } from "@/components/MessageItem/MessageItem";
import { useParams } from "react-router-dom";


import { List, useDynamicRowHeight } from "react-window";

export type Owner = {
    avatar: string;
    name: string;
}

export type MessageDate = {
    owner: Owner,
    text: string;
    time: string,
    isOwner: boolean
}

const Room = () => {
    const { roomID } = useParams();

    const rowHeight = useDynamicRowHeight({
        defaultRowHeight: 57.33
    });

    return (
        <div className="room_container">
            <List
                className="room_content_container"
                rowComponent={MessageItem}
                rowCount={messageList.length}
                rowHeight={rowHeight}
                rowProps={{ data: messageList }}
                
            />
            <DialogInput />
        </div>
    )
}

export default Room;


