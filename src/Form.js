import {useRef, useState, useEffect, useCallback} from 'react';
import {useForm, Controller} from 'react-hook-form';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import {useLocation, useNavigate} from "react-router-dom";

import './Form.css';
import {Button, Input} from "reactstrap";
import BellIcon from './assets/bells.png';
import CheckIcon from './assets/check-lg.svg';

const SHEET_ID = process.env.REACT_APP_SHEET_ID;
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.REACT_APP_GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.REACT_APP_GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
const S3_BUCKET = process.env.REACT_APP_S3_BUCKET;
const REGION = process.env.REACT_APP_REGION;
const ACCESS_KEY = process.env.REACT_APP_ACCESS_KEY;
const SECRET_ACCESS_KEY = process.env.REACT_APP_SECRET_ACCESS_KEY;


const TIMESLOTS_TABLE = {day1: 1358113787, day2: 985358221};
const RESPONSE_TABLE = {day1: 883456226, day2: 1241199622};

const days = {
  day1: 'Day 1: 12月25日（六）',
  day2: 'Day 2: 12月26日（日）',
};

const dateOptions = [
  {label: days.day1, value: 'day1'},　
  {label: days.day2, value: 'day2'},
];

function Form(props) {
  const carouselRef = useRef(null);
  const [width, setWidth] = useState(window.innerWidth * 0.9);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(['claim', 'summary']);
  const [loading, setLoading] = useState(false);
  const [row, setRow] = useState({});
  const [status, setStatus] = useState('fetching');

  const { handleSubmit, control, getValues, register, unregister, formState: {errors}, watch, reset } = useForm();
  const location = useLocation();
  const navigate = useNavigate();

  const doc = new GoogleSpreadsheet(SHEET_ID);

  useEffect(() => {
    setWidth(carouselRef.current.offsetWidth);
  }, [carouselRef]);

  useEffect(async () => {
    const {date, id} = location.state;
    setStatus('fetching');
    await doc.useServiceAccountAuth({
      client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: GOOGLE_PRIVATE_KEY,
    });
    await doc.loadInfo();
    const sheet = doc.sheetsById[RESPONSE_TABLE[date]];
    const rows = await sheet.getRows({limit: 200});
    const hash = new Map();
    rows.forEach((row) => hash.set(row.id, row));
    const row = hash.get(id);
    console.log(row);
    if (!row) {
      setStatus('notFound');
    } else {
      setRow(row)
      setStatus('done');
    }
  }, []);


  const onSubmit = useCallback(async (data) => {
    row['已填寫健康申報'] = true;
    row['出席日期'] = (new Date()).toLocaleString("en-US");
    await row.save();
    setPage(page+1);
  }, [row, page]);

  const goBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  return (
    <div className="app formPage">
        <div className="carousel" ref={carouselRef}>
          {
            status === 'fetching' ?
              <div>
                <img className={'loading spinner'} src={BellIcon} />
              </div> :
              status === 'notFound' ?
                <div>
                  <div className={'header'}>{`找不到登記資料`}</div>
                </div> :
                <div className={'content'} style={{ marginLeft: -width * page}}>
                  {/*Page 1*/}
                  <div className={'page'} style={{ minWidth: width }}>
                    <form id="claimForm" className="form" onSubmit={handleSubmit(onSubmit)}>
                      <div className={'header'}>{`健康申報`}</div>
                      <div className="form-group">
                        <input id="name" name="name" type="text" defaultValue={row['姓名']} disabled />
                      </div>
                      <div className="form-group">
                        <input id="phone" name="phone" type="text" defaultValue={row['電話']} disabled />
                      </div>
                      <div className="form-group">
                        <Controller
                          control={control}
                          defaultValue={true}
                          render={({field: {onChange}}) =>
                            <div className={`check-box${watch('healthy') ? ' active' : ''}`} onClick={() => onChange(!watch('healthy'))}>
                              { watch('healthy') && <img src={CheckIcon} /> }
                              <div className={'check-box-label'}>健康狀況良好</div>
                            </div>
                          }
                          rules={{
                            required: (value) => value
                          }}
                          name={'healthy'}
                        />
                        {
                          errors.healthy && <div className={'error'}>請確認健康狀況良好</div>
                        }
                      </div>
                    </form>
                  </div>
                  {/*Page summary*/}
                  <div className={'page'} style={{ minWidth: width }}>
                    <div className={'label'}>{`多謝參與`}</div>
                  </div>
                </div>
          }
        </div>
      {
        pages[page] === 'claim' &&
          <div className='bottom-buttons'>
            {
              status === 'notFound' ?
                <Button className="bottom-button" type={'button'} size={'lg'} color={'primary'} onClick={goBack}>
                  返回
                </Button> :
                status === 'done' ?
                <Button className="bottom-button" form={'claimForm'} type={'submit'} size={'lg'} color={'primary'}>
                  {
                    loading ?
                      <div><img className={'loading spinner'} src={BellIcon} /></div> :
                      '提交表格'
                  }
                </Button> : null
            }
          </div>
      }
      {
        pages[page] === 'summary' &&
        <div className='bottom-buttons'>
          {
            <Button className="bottom-button" type={'button'} size={'lg'} color={'primary'} onClick={goBack}>
              返回
            </Button>
          }
        </div>
      }
    </div>
  );
};

export default Form;
