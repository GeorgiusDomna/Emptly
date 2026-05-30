import Post from './Post.js';
import PostService from './PostService.js';

class PostController {
    async create(req, res) {
        try {
            const post = await PostService.create(req.body, req.files.picture);
            return res.json(post);
        } catch (err) {
            res.status(500).json(err);
        } 
    }

    async getAll(req, res) {
        try {
            const posts = await PostService.getAll(req.query);
            return res.json(posts);
        } catch (err) {
            res.status(500).json(err);
        }
    }

    async getOne(req, res) {
        try {
            const posts = await PostService.getOne(req.params.id);
            return res.json(posts);
        } catch (err) {
            res.status(500).json(err);
        }
    }

    async update(req, res) {
        try {
            const updatedPost = await PostService.update(req.body);
            return res.json(updatedPost);
        } catch (err) {
            res.status(500).json(err);
        }
    }

    async delete(req, res) {
        try {
            const posts = await PostService.delete(req.params.id);
            return res.json(posts);

        } catch (err) {
            res.status(500).json(err);
        }
    }


}

export default new PostController();