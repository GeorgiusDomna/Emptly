import FileService from './FileService.js';
import Post from './Post.js';

class PostService {
    async create(post, picture) {
        const fileName = FileService.saveFile(picture);
        const createdPost = await Post.create({ ...post, picture: fileName });
        return createdPost;
    }

    async getAll() {
        const posts = await Post.find();
        return posts;
    }

    async getOne(id) {
        if (!id) throw new Error('id не указан');

        const posts = await Post.findById(id);
        return posts;
    }

    async update(post) {
        if (!post._id) throw new Error('id не указан');

        const updatedPost = await Post.findByIdAndUpdate(post._id, post, { new: true });
        return updatedPost;
    }

    async delete(id) {
        if (!id) throw new Error('id не указан');

        const posts = await Post.findByIdAndDelete(id);
        return posts;
    }
}

export default new PostService();