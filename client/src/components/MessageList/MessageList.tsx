import { MessageItem } from "@/components/MessageItem/MessageItem";
import { MessageDate } from "@/pages/Room/Room";
import { List, useDynamicRowHeight } from "react-window";

interface MessageListProps {
    list: MessageDate[]
}

export const MessageList: React.FC<MessageListProps> = ({ list }) => {

    const rowHeight = useDynamicRowHeight({
        defaultRowHeight: 57.33
    });

    return (
        <List
            className="room_content_container"
            rowComponent={MessageItem}
            rowCount={list.length}
            rowHeight={rowHeight}
            rowProps={{ data: list }}
        />
    )
}