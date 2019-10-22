import axios from 'axios';
import {
    showAlert
} from './alerts'

export const login = async (email, password) => {

    try {
        console.log(email, password)
        const res = await axios({
            method: 'POST',
            url: 'http://127.0.0.1:3000/api/v1/users/login',
            data: {
                email: email,
                password: password
            }
        });

        if (res.data.status === 'success') {
            showAlert('success', 'Logged in successfully!');
            window.setTimeout(() => {
                location.assign('/');
            }, 1500);
        }
    } catch (err) {
        showAlert('error', err.response.data.message);
    }



};

export const logout = async () => {
    try {
        const res = await axios({
            method: 'GET',
            url: 'http://127.0.0.1:3000/api/v1/users/logout'
        });
        // it's importat that we pass true to the location.reload
        // then it will reload and take information from the server, and not possibly from the cache
        if (res.data.status === 'success') location.reload(true);
    } catch (err) {
        console.log(err.response);
        showAlert('error', 'Error logging out, try again.')
    }
}