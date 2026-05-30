import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { MessageList } from "@/components/MessageList/MessageList";
import { DialogInput } from "@/components/DialogInput/DialogInput";
// import { messageList } from "@/dataBase/massegeList";
import './room.sass';

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
    const [connected, setConnected] = useState(false);
    const [messagesList, setMessagesList] = useState([]);
    const [message, setMessage] = useState('');

    const socket = useRef<WebSocket>(null);

    useEffect(() => {
        console.log(messagesList)
    }, [messagesList])
    
    useEffect(() => {
        socket.current = new WebSocket('ws://localhost:5001');

        socket.current.onopen = () => {
            setConnected(true);
            const message = {
                event: 'connaction',
                id: Date.now(),
                username: 'Adam'
            };
            socket.current.send(JSON.stringify(message));
        }

        socket.current.onmessage = (event) => {
            const message = JSON.parse(event.data);
            setMessagesList(prev => [...prev, message]);
        }

        socket.current.onclose = () => {
            console.log('Socket - close');
        }

        socket.current.onerror = () => {
            console.log('Socket - error');
        }
    }, [])

    const handleSubmit = async () => {
        const body = {
            username: 'Adam',
            id: Date.now(),
            event: 'message',
            text: message
        }
        socket.current.send(JSON.stringify(body));
    };

    return (
        <div className="room_container">
            <MessageList list={messagesList} />
            <DialogInput 
                value={message} 
                onChange={setMessage} 
                onSubmit={handleSubmit} 
            />
        </div>
    )
}

export default Room;


