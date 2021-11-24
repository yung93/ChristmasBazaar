import {useRef, useState, useEffect, useCallback} from 'react';
import {useForm, Controller} from 'react-hook-form';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { v1 as uuid } from 'uuid';
import QRCode from 'qrcode.react';
import emailjs, { init } from 'emailjs-com';
import { uploadFile } from 'react-s3';

import './App.css';
import Selector from "./Selector";
import {Button, Input} from "reactstrap";
import BackIcon from './assets/caret-left.svg';
import PlusIcon from './assets/plus-lg.svg';
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

const belongsToOptions = [
  {label: '顯理學生', value: '顯理學生'},
  {label: '顯理校友', value: '顯理校友'},
  {label: '顯理老師', value: '顯理老師'},
  {label: '顯理學生家長', value: '顯理學生家長'},
  {label: '顯理福音堂', value: '顯理福音堂'},
  {label: '其他教會', value: '其他教會'},
  {label: '相熟親友', value: '相熟親友'},
]
const churchOptions = [
  {label: '香港浸信教會', value: '香港浸信教會'},
  {label: '好鄰舍福音堂', value: '好鄰舍福音堂'},
  {label: '赤柱福音堂', value: '赤柱福音堂'},
  {label: '石澳福音堂', value: '石澳福音堂'},
  {label: '其他', value: '其他'}
]
const days = {
  day1: 'Day 1: 12月25日 (六)',
  day2: 'Day 2: 12月26日 (日)',
};

const dateOptions = [
  {label: days.day1, value: 'day1'},　
  {label: days.day2, value: 'day2'},
]

function App() {
  const carouselRef = useRef(null);
  const [width, setWidth] = useState(window.innerWidth * 0.9);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(['dates', 'info', 'summary']);
  const [dates, setDates] = useState([]);
  const [info, setInfo] = useState({});
  const [loading, setLoading] = useState(false);
  const [workshopOptions, setWorkshopOptions] = useState({day1: {}, day2: {}});
  const [timetable, setTimeTable] = useState({day1: {}, day2: {}});
  const [id, setId] = useState(null);
  const [error, setError] = useState(null);

  const { handleSubmit, control, getValues, register, unregister, formState: {errors}, watch, reset } = useForm();
  const { handleSubmit: handleSubmitDate, control: controlDate, formState: {errors: errorsDate}, reset: resetDate } = useForm();
  const { handleSubmit: handleSubmitWorkshop, control: controlWorkshop, unregister: unregisterWorkshop, reset: resetWorkshop} = useForm();

  const doc = new GoogleSpreadsheet(SHEET_ID);

  const belongsTo = watch('belongsTo');

  useEffect(() => {
    init("user_bfmnTJLKF8AlzxIpH5aNt");
    initGoogleSheet();
  }, []);

  useEffect(() => {
    setWidth(carouselRef.current.offsetWidth);
  }, [carouselRef]);

  useEffect(() => {
    if (id) {
      handleUploadQrCode(id);
    }
  }, [id]);

  const handleUploadQrCode = useCallback((id) => {
    const QRCode = document.getElementById('QRCode');
    QRCode.toBlob((blob) => {
      const file = new File([blob], `${id}.png`);
      const config = {
        bucketName: S3_BUCKET,
        region: REGION,
        accessKeyId: ACCESS_KEY,
        secretAccessKey: SECRET_ACCESS_KEY,
      }
      uploadFile(file, config);
    });
  }, []);

  const handleSendEmail = useCallback(async (id) => {
    let workshop = `
<hr class="rounded" />
<div style="text-align: center;">
<p style="text-align: center;">你已報名已下工作坊：</p>`;
    let newWorkshop = '';
    dates.forEach((day) => {
      if (Object.keys(timetable[day]).length > 0) {
        newWorkshop += `<p style="text-align: center;">${days[day]}</p>`;
      }
      Object.keys(timetable[day]).sort().forEach((time) => {
        newWorkshop += `<p style="text-align: center;">${time} ${Object.keys(timetable[day][time]).filter((key) => timetable[day][time][key]).join(', ')}</p>`;
      })
    });
    workshop += newWorkshop;
    return emailjs.send('service_da2fco8', 'template_r9bzhjo', {
      to_name: info.name,
      dates: dates.map((day) => days[day]).join(', '),
      to_email: info.email,
      workshop: newWorkshop.length > 0 ? workshop : '',
      qrCode: `https://${S3_BUCKET}.s3.${REGION}.amazonaws.com/${id}.png`,
      id: id,
    });
  }, [dates, info]);

  const initGoogleSheet = useCallback(async () => {
    await doc.useServiceAccountAuth({
      client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: GOOGLE_PRIVATE_KEY,
    });
    await doc.loadInfo();
    const sheet = [doc.sheetsById[TIMESLOTS_TABLE.day1], doc.sheetsById[TIMESLOTS_TABLE.day2]];
    const rows = [await sheet[0].getRows({limit: 10}), await sheet[1].getRows({limit: 10})];
    const workshops = {};
    if (rows[0] && rows[1]){
      rows.forEach((day, index) => {
        const temp = {};
        day.forEach((row) => {
          row._sheet.headerValues.forEach((key) => {
            if (row[key]) {
              temp[key] = [...(temp[key] || []), row[key]];
            }
          })
        });
        workshops[`day${index+1}`] = temp;
      })
    };
    setWorkshopOptions(workshops);
  }, [])

  const onSubmitDate = useCallback((data) => {
    setPages(['dates', 'info', ...data.dates, 'summary']);
    setDates(data.dates.sort());
    handleNext();
  }, [page]);

  const onSubmitInfo = useCallback((data) => {
    setInfo(data);
    handleNext();
  }, [page]);

  const onSubmitWorkshop = useCallback(async(data) => {
    setLoading(true);
    const id = uuid();
    setId(id);
    const infoData = {
      'id': id,
      '登記日期': (new Date()).toLocaleString("en-US"),
      '姓名': info.name,
      '電話': info.phone,
      '所屬群體': info.belongsTo,
      '學生姓名': info.studentName,
      '教會名稱': info.churchName,
      '其他教會名稱': info.otherChurch,
      '親友姓名': info.acquaintanceName,
      '親友所屬群體': info.acquaintanceBelongsTo,
      '接收資訊': info.promotion,
    };

    const extraData = {
      '出席日期': undefined,
      '已填寫健康申報': undefined,
    }

    await doc.useServiceAccountAuth({
      client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: GOOGLE_PRIVATE_KEY,
    });
    await doc.loadInfo();
    const promises = dates.map(async (day) => {
      const sheet = doc.sheetsById[RESPONSE_TABLE[day]];
      const row = {...infoData, ...data[day], ...extraData};
      try {
        await sheet.loadHeaderRow()
      }
      catch {
        await sheet.setHeaderRow(Object.keys(row));
      } finally {
        return await sheet.addRow(row);
      }
    });
    try {
      await Promise.all(promises);
    } catch (error) {
      setError(error);
      setLoading(false);
    }
    try {
      await handleSendEmail(id);
    } finally {
      handleNext();
      setLoading(false);
    }
  }, [page, info, dates]);

  const handleBack = useCallback(() => {
    setPage(page-1);
  }, [page]);

  const handleNext = useCallback(() => {
    setPage(page+1);
  }, [page]);

  const handleTimeSelect = useCallback((date, workshop, timeslot, onChange) => {
    const temp = {...timetable};
    temp[date][timeslot] = {...(temp[date][timeslot] || {})}
    if (temp[date][timeslot][workshop]) {
      delete temp[date][timeslot][workshop];
      unregisterWorkshop(`${date}.${workshop}(${timeslot})`);
      if (Object.keys(temp[date][timeslot]).length === 0) {
        delete temp[date][timeslot];
      }
    } else {
      temp[date][timeslot][workshop] = true;
      onChange(temp[date][timeslot][workshop]);
    }
    setTimeTable(temp);
  }, [timetable]);

  const handleReset = useCallback(() => {
    reset({promotion: true});
    resetDate({dates: []});
    resetWorkshop();
    setDates([]);
    setInfo({});
    setTimeTable({day1: {}, day2: {}});
    setPage(0);
    setError(null);
    setId(null);
  }, [reset, resetDate, resetWorkshop]);

  return (
    <div className="app">
        <div className="carousel" ref={carouselRef}>
          <div className={'content'} style={{ marginLeft: -width * page}}>
            {/*Page 1*/}
            <div className={'page'} style={{ minWidth: width }}>
              <form id="dateForm" className="form" onSubmit={handleSubmitDate(onSubmitDate)}>
                <div className={'header'}>{`「Fun享愛」`}<br/>{`聖誕嘉年華會`}</div>
                {
                  errorsDate.dates && <div className={'error'}>請選擇至少一日</div>
                }
                <div className="form-group">
                  <Selector control={controlDate} name={'dates'} options={dateOptions} requird multiple full />
                </div>
              </form>
            </div>
            {/*Page 2*/}
            <div className={'page'} style={{ minWidth: width }}>
              <form id="infoForm" className="form" onSubmit={handleSubmit(onSubmitInfo)}>
                <div className="form-group">
                  <div className="label" htmlFor="name">姓名(全名)</div>
                  {
                    errors.name && <div className={'error'}>請輸入姓名</div>
                  }
                  <input id="name" name="name" type="text" placeholder={'e.g. Chan Siu Ming'} {...register('name', {required: true})}/>
                </div>
                <div className="form-group">
                  <div className="label" htmlFor="phone">電話</div>
                  {
                    errors.phone && <div className={'error'}>請輸入電話號碼</div>
                  }
                  <input id="phone" name="phone" type="tel" {...register('phone', {required: true})}/>
                </div>
                <div className="form-group">
                  <div className="label" htmlFor="email">電郵地址</div>
                  {
                    errors.email && <div className={'error'}>請輸入有效電郵地址</div>
                  }
                  <input id="email" name="email" type="email" {...register('email', {required: true, pattern: /^\S+@\S+$/i})}/>
                </div>
                <div className="form-group">
                  <div className="label" htmlFor="belongsTo">屬於哪個群體？</div>
                  {
                    errors.belongsTo && <div className={'error'}>請選擇其中一項</div>
                  }
                  <Controller
                    control={control}
                    rules={{
                      required: (value) => {
                        return (!!value && value.length > 0)
                      }
                    }}
                    name={'belongsTo'}
                    render={({field: { onChange }}) =>
                      <Input
                        type="select"
                        name="belongsTo"
                        id="belongsTo"
                        onChange={onChange}>
                        <option value={null} />
                        {
                          belongsToOptions.map((option) =>
                            <option value={option.value} key={`belongsTo_${option.value}`}>{option.label}</option>
                          )
                        }
                      </Input>
                    }
                  />
                </div>
                {
                  belongsTo === '顯理學生家長' ?
                    <div className="form-group">
                      <div className="label" htmlFor="studentName">學生姓名</div>
                      {
                        errors.studentName && <div className={'error'}>請輸入學生姓名</div>
                      }
                      <input id="studentName" name="studentName" type="text" {...register('studentName', {required: true, shouldUnregister: true})}/>
                    </div> :
                    belongsTo === '相熟親友' ?
                      <div>
                        <div className="form-group">
                          <div className="label" htmlFor="acquaintanceBelongsTo">親友屬於哪個群體？</div>
                          {
                            errors.acquaintanceBelongsTo && <div className={'error'}>請選擇其中一項</div>
                          }
                          <Controller
                            control={control}
                            rules={{
                              required: (value) => {
                                return (!!value && value.length > 0)
                              }
                            }}
                            shouldUnregister
                            name={'acquaintanceBelongsTo'}
                            render={({field: { onChange }}) =>
                              <Input
                                type="select"
                                name="acquaintanceBelongsTo"
                                id="acquaintanceBelongsTo"
                                onChange={onChange}>
                                <option value={null} />
                                {
                                  belongsToOptions.slice(0, belongsToOptions.length-1).map((option) =>
                                    <option value={option.value} key={`acquaintanceBelongsTo_${option.value}`}>{option.label}</option>
                                  )
                                }
                              </Input>
                            }
                          />
                        </div>
                        <div className="form-group">
                          <div className="label" htmlFor="acquaintanceName">親友姓名</div>
                          {
                            errors.acquaintanceName && <div className={'error'}>請輸入親友姓名</div>
                          }
                          <input id="acquaintanceName" name="acquaintanceName" type="text" {...register('acquaintanceName', {required: true, shouldUnregister: true})}/>
                        </div>
                      </div>
                       :
                      belongsTo === '其他教會' ?
                        <div className="form-group">
                          <div className="label" htmlFor="churchName">教會名稱</div>
                          {
                            errors.churchName && <div className={'error'}>請選擇其中一項</div>
                          }
                          <Controller
                            control={control}
                            rules={{
                              required: (value) => {
                                return (!!value && value.length > 0)
                              }
                            }}
                            shouldUnregister
                            name={'churchName'}
                            render={({field: { onChange }}) =>
                              <Input
                                type="select"
                                name="churchName"
                                id="churchName"
                                onChange={onChange}>
                                <option value={null} />
                                {
                                  churchOptions.map((option) =>
                                    <option value={option.value} key={`churchName_${option.value}`}>{option.label}</option>
                                  )
                                }
                              </Input>
                            }
                          />
                        </div> : null
                }
                {
                  watch('churchName') === '其他' &&
                    <div className="form-group">
                      <div className="label" htmlFor="otherChurch">教會名稱</div>
                      {
                        errors.otherChurch && <div className={'error'}>請輸入教會名稱</div>
                      }
                      <input id="otherChurch" name="otherChurch" type="text" {...register('otherChurch', {required: true, shouldUnregister: true})}/>
                    </div>
                }
                <div className="form-group">
                  <Controller
                    control={control}
                    defaultValue={true}
                    render={({field: {onChange}}) =>
                      <div className={`check-box${watch('promotion') ? ' active' : ''}`} onClick={() => onChange(!watch('promotion'))}>
                        { watch('promotion') && <img src={CheckIcon} /> }
                        <div className={'check-box-label'}>希望收到日後有關的活動資訊</div>
                      </div>
                    }
                    name={'promotion'}
                  />

                </div>
              </form>
            </div>
            {/*Page 3,4*/}
            <form id={`workshopForm`} onSubmit={handleSubmitWorkshop(onSubmitWorkshop)} style={{display: 'flex', alignItems: 'flex-start'}}>
            {
              dates.map((date) => {
                return (
                  <div className={'form page'} style={{ minWidth: width }} key={`workshop_${date}`}>
                      <div className={'label'}>{`工作坊報名(${date === 'day2' ? 'Day 2' : 'Day 1'})`}</div>
                      <div className={'hints'}>請選擇有興趣參與的工作坊</div>
                      {
                        Object.keys(workshopOptions[date]).map((workshopName) => {
                          return (
                            <div className={'workshop-group'} key={`workshop_${date}_${workshopName}`}>
                              <div className={'form-group inline'}>
                                <div className={'label'}>{workshopName}</div>
                              </div>
                              <div>
                                {
                                  workshopOptions[date][workshopName].map((timeslot) => {
                                    const active = timetable[date] && timetable[date][timeslot] && timetable[date][timeslot][workshopName];
                                    const disabled = timetable[date] && timetable[date][timeslot] && !timetable[date][timeslot][workshopName];

                                    return (
                                      <Controller
                                        key={`workshop_${date}_${workshopName}_${timeslot}`}
                                        control={controlWorkshop}
                                        name={`${date}.${workshopName}(${timeslot})`}
                                        render={({field: {onChange}}) => (
                                          <div className={'timepicker noselect'}>
                                            <div
                                              className={`select-button${active ? ' active' : ''}${disabled ? ' disabled' : ''}`}
                                              onClick={() => {
                                                if (disabled) return;
                                                handleTimeSelect(date, workshopName, timeslot, onChange)}
                                              }
                                            >
                                              {timeslot}
                                            </div>
                                          </div>
                                        )}
                                      />
                                    )
                                  })
                                }
                              </div>
                            </div>
                          )
                        })
                      }
                  </div>
                )
              })
            }
            </form>
            {/*Page summary*/}
            <div className={'page'} style={{ minWidth: width }}>
              {
                error ?
                  <div className={'label'}>{`出現錯誤，未能完成登記`}</div> :
                  <div>
                    <div className={'label'}>{`多謝參與，${info.name} :)`}</div>
                    <div className={'label'}>{'請查收確認電郵，活動當日請向場內工作人員出示以下二維碼。'}</div>
                    <div className={'qr-code-container'}>
                      { id && <QRCode id={'QRCode'} value={id} bgColor={'#fff6f1'} fgColor={'#4a4a4a'} size={Math.min(250, width - 50)} /> }
                      {
                        <div className={'id'}>{id}</div>
                      }
                    </div>
                  </div>
              }
            </div>
          </div>
        </div>
      {
        pages[page] === 'dates' &&
          <div className='bottom-buttons'>
            <Button className="bottom-button" form={'dateForm'} type={'submit'} size={'lg'} color={'primary'}>下一步</Button>
          </div>
      }
      {
        pages[page] === 'info' &&
          <div className='bottom-buttons'>
            <Button className="bottom-button noselect" size={'lg'} color={'primary'} onClick={handleBack} outline><img src={BackIcon} /></Button>
            <Button className="bottom-button" form={'infoForm'} type={'submit'} size={'lg'} color={'primary'}>下一步</Button>
          </div>
      }
      {
        (pages[page] === 'day1' ||  pages[page] === 'day2')  &&
          <div className='bottom-buttons'>
            <Button className="bottom-button noselect" size={'lg'} color={'primary'} onClick={handleBack} outline><img src={BackIcon} /></Button>
            {
              page === pages.length - 2 ?
                <Button key="submitButton" className="bottom-button" form={`workshopForm`} type={'submit'} size={'lg'} color={'primary'}>
                  {
                    loading ?
                      <div><img className={'loading spinner'} src={BellIcon} /></div> :
                      '提交表格'
                  }
                </Button> :
                <Button
                  className="bottom-button"
                  size={'lg'}
                  color={'primary'}
                  type={'button'}
                  onClick={handleNext}
                >
                  下一步
                </Button>
            }
          </div>
      }
      {
        pages[page] === 'summary' &&
          <div className='bottom-buttons'>
            <Button className="bottom-button" type={'button'} size={'lg'} color={'primary'} onClick={handleReset}>
              { error ? '重新登記' : '下一個登記' }
            </Button>
          </div>
      }
    </div>
  );
};

export default App;
