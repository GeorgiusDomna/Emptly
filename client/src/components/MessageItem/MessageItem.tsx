// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Item } from "@/components/ui/item"
import { cn } from "@/lib/utils"
import { MessageDate } from "@/pages/Room/Room";
import { RowComponentProps } from "react-window";

type MessageItemProps = {
    data: MessageDate[];
};

export const MessageItem = ({ data, index, style }: RowComponentProps<MessageItemProps>) => {
    const message = data[index];
    const prevMessage = index > 0 ? data[index-1] : null;
    const { owner, text, time, isOwner } = message;

    let marginTop = 10;
    if (prevMessage && prevMessage?.owner?.name === owner?.name) {
        marginTop = 5;
    }

    return (
        <div style={style}>
            <div 
                style={{ marginTop: `${marginTop}px` }} 
                className={cn("max-w-[780px] m-auto")}
            >
                <Item className={cn(
                    "px-4 py-2 rounded-2xl max-w-[500px] w-fit",
                    isOwner
                        ? "ml-auto bg-primary text-primary-foreground"
                        : "mr-auto bg-muted text-foreground"
                )}>
                    <div className="flex items-end space-x-2">
                        {/* {!isOwn && (
                            <Avatar>
                                <AvatarImage src="https://github.com/shadcn.png" alt={`avatar ${owner.name}`} />
                                <AvatarFallback>CN</AvatarFallback>
                            </Avatar>
                        )} */}
                        <div className="flex flex-col">
                        {/* {!isOwn && <span className="text-xs font-medium">{owner.name}</span>} */}
                        <p className="text-base">{text}</p>
                        <span className="text-xs text-muted-foreground self-end">{time}</span>
                        </div>
                    </div>
                </Item>
            </div>
        </div>
    )
}

